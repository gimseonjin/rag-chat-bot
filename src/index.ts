import { getEmbedding } from './utils/getEmbeddings';

const vector = await getEmbedding('샘플 텍스트');
console.log(vector)