import { pgClient } from './utils/pgClient.js';
import { getAnswerFromGpt } from './utils/getAnswerFromGpt.js';

async function main() {
  const question = process.argv.slice(2).join(' ').trim();
  if (!question) {
    console.error('Usage: npm run answerQuestion -- "질문내용"');
    process.exitCode = 1;
    return;
  }

  await pgClient.connect();
  try {
    const { answer, similarDocs } = await getAnswerFromGpt(question);

    console.log(answer);
    if (similarDocs.length > 0) {
      console.log('\n[참고 문서]');
      for (const doc of similarDocs) {
        console.log(`- ${doc.title} (${doc.slug})`);
      }
    }
  } finally {
    await pgClient.end();
  }
}

main().catch((err) => {
  console.error('[answer] Failed:', err);
  process.exitCode = 1;
});