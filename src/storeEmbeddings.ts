import fs from 'fs';
import path from 'path';
import { pgClient } from './utils/pgClient.js';
import { getEmbedding } from './utils/getEmbeddings.js';

interface PostIndex {
  slug: string;
  title: string;
  updated_at: string;
}

interface PostData {
  slug: string;
  title: string;
  content: string;
  updated_at: string;
}

async function storeEmbeddings() {
  await pgClient.connect();

  try {
    // 1. index.json 읽기
    const postsDir = path.join(process.cwd(), 'posts');
    const indexPath = path.join(postsDir, 'index.json');
    const indexContent = fs.readFileSync(indexPath, 'utf-8');
    const postIndex: PostIndex[] = JSON.parse(indexContent);

    console.log(`Found ${postIndex.length} posts to process`);

    // 2. 각 포스트 처리
    for (let i = 0; i < postIndex.length; i++) {
      const post = postIndex[i];
      console.log(`[${i + 1}/${postIndex.length}] Processing: ${post.slug}`);

      // 2-1. slug.json 파일 읽기
      const postFilePath = path.join(postsDir, `${post.slug}.json`);
      if (!fs.existsSync(postFilePath)) {
        console.warn(`  File not found: ${postFilePath}`);
        continue;
      }

      const postContent = fs.readFileSync(postFilePath, 'utf-8');
      const postData: PostData = JSON.parse(postContent);

      // 2-2. 임베딩 생성
      console.log('  Generating embedding...');
      const embedding = await getEmbedding(postData.content);

      // 2-3. DB 저장
      const query = `
        INSERT INTO anotherclass_guide (slug, title, content, updated_at, embedding)
        VALUES ($1, $2, $3, $4, $5::vector)
      `;

      await pgClient.query(query, [
        postData.slug,
        postData.title,
        postData.content,
        postData.updated_at,
        JSON.stringify(embedding),
      ]);

      console.log('  Stored successfully\n');
    }

    console.log('All posts processed!');
  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await pgClient.end();
  }
}

storeEmbeddings();