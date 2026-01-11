import { defineConfig } from 'tsdown';

export default defineConfig({
  entry: ['src/index.ts', "src/fetchPosts.ts", "src/storeEmbeddings.ts", "src/answerQuestion.ts"],
  format: ['esm'],
  target: 'node20',
  outDir: 'dist',
  sourcemap: 'inline',
  clean: true,
  unbundle: true,
  fixedExtension: false,
});