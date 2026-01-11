import OpenAI from 'openai';
import dotenv from 'dotenv';
import { pgClient } from './pgClient.js';
import { getEmbedding } from './getEmbeddings.js';

dotenv.config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface SimilarDoc {
  slug: string;
  title: string;
  content: string;
  similarity: number;
}

async function searchSimilarDoc(questionEmbedding: number[]): Promise<SimilarDoc[]> {
  const searchQuery = `
    SELECT slug, title, content,
           1 - (embedding <=> $1::vector) AS similarity
    FROM anotherclass_guide
    ORDER BY embedding <=> $1::vector
    LIMIT 3
  `;

  const result = await pgClient.query(searchQuery, [
    JSON.stringify(questionEmbedding),
  ]);

  return result.rows;
}

async function getAnswerFromGpt(userQuestion: string) {
  // 1) 사용자 질문을 임베딩으로 변환
  console.log('Generating question embedding...');
  const questionEmbedding = await getEmbedding(userQuestion);

  // 2) 벡터 유사도 검색으로 관련 문서 찾기
  console.log('Searching similar documents...');
  const similarDocs = await searchSimilarDoc(questionEmbedding);

  // 3) 검색된 문서들을 컨텍스트로 GPT에게 답변 요청
  console.log('Generating answer with GPT...');
  const context = similarDocs
    .map((doc) => `[${doc.title}]\n${doc.content}`)
    .join('\n\n---\n\n');

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `당신은 어나더클래스 학원 관리 시스템의 고객 지원 AI입니다.
제공된 문서를 기반으로 사용자의 질문에 친절하고 정확하게 답변하세요.
문서에 없는 내용은 "제공된 문서에서 해당 정보를 찾을 수 없습니다"라고 답변하세요.`,
      },
      {
        role: 'user',
        content: `다음 문서들을 참고하여 질문에 답변해주세요.

[참고 문서]
${context}

[질문]
${userQuestion}`,
      },
    ],
  });

  const answer = completion.choices[0].message.content || '답변을 생성할 수 없습니다.';

  // 4) 최종 결과 리턴
  return { answer, similarDocs };
}

export { getAnswerFromGpt };