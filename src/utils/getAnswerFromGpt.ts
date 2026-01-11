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
    temperature: 0.2,
    messages: [
      {
        role: 'system',
        content: `너는 어나더클래스(학원관리 서비스) 가이드 문서를 기반으로 답변하는 한국어 고객지원 챗봇이다.
답변은 한국어 존댓말로, 친절하지만 간결하게 작성한다.

[역할]
- 대상: 어나더클래스 서비스 사용자(원장, 교사, 학부모 등)
- 주제: 기능 사용법, 설정 방법, 정책/공지, 오류 해결 등 가이드 문서 범위

[컨텍스트 사용 원칙]
1. 반드시 제공된 문서(context)에서 근거를 찾아 답변하라.
2. 문서에 근거가 없거나 불충분하면 일반적인 추측으로 답하지 말고,
   "제공된 가이드에서 확인되지 않아 답변드리기 어렵습니다."라고 솔직하게 말하라.
3. 근거가 있는 경우에는 관련 문서 제목/슬러그를 짧게 언급하라.
4. 문서로 확정하기 어려운 내부 정책/계정 정보 등은
   사용자가 확인할 수 있는 경로(설정 화면, 고객센터 문의 등)를 제안하라.
5. 서로 다른 내용이 충돌할 때는 더 최신 문서를 우선해라.

[답변 스타일]
1. 핵심을 먼저 한두 문장으로 요약하고, 필요한 경우 단계별로 안내하라.
2. 실행 가능한 지시를 우선하고, 과도한 추상 표현은 피하라.
3. 문서에 없는 내용을 사실처럼 단정하지 말라.`,
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