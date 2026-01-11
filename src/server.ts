import express, { type Request, type Response } from 'express';
import dotenv from 'dotenv';
import { getAnswerFromGpt } from './utils/getAnswerFromGpt.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok' });
});

app.post('/ask', async (req: Request, res: Response) => {
  try {
    const { question } = req.body;

    if (!question || typeof question !== 'string' || question.trim() === '') {
      res.status(400).json({ error: 'Question is required and must be a non-empty string' });
      return;
    }

    const { answer, similarDocs } = await getAnswerFromGpt(question.trim());

    res.json({
      answer,
      references: similarDocs.map((doc) => ({
        title: doc.title,
        slug: doc.slug,
        similarity: doc.similarity,
      })),
    });
  } catch (error) {
    console.error('[/ask] Error:', error);
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Internal server error',
    });
  }
});

const server = app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Ask endpoint: POST http://localhost:${PORT}/ask`);
});

process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', async () => {
  console.log('SIGINT received, shutting down gracefully...');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
