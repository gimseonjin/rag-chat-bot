# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**RAG Chat Bot** - A Retrieval-Augmented Generation chatbot built for AnotherClass (Korean academy management service). The system fetches documentation from Ghost CMS, generates embeddings using OpenAI, stores them in PostgreSQL with pgvector, and answers user questions using semantic search + GPT-4.

**Tech Stack**: TypeScript, Node.js 20+, PostgreSQL 16 (pgvector), OpenAI API, tsdown

## Development Commands

### Database Setup
```bash
docker-compose up  # Starts PostgreSQL 16 with pgvector at localhost:5432
```

### Build and Run
```bash
npm run build              # Compile TypeScript to ESM with tsdown
npm start                  # Run embedding test (index.ts)
npm run fetchPosts         # Fetch posts from Ghost CMS API → save to /posts
npm run storeEmbeddings    # Generate embeddings → store in PostgreSQL
npm run answerQuestion -- "your question"  # Answer via RAG pipeline
```

### Code Quality
```bash
# ESLint configured with TypeScript + Prettier
# Prettier: 100 char width, 2 spaces, single quotes
```

## Architecture

### Multi-Stage ETL Pipeline
```
1. Ghost CMS API → fetchPosts.ts → /posts/*.json (cached)
2. /posts/*.json → storeEmbeddings.ts → PostgreSQL (with embeddings)
3. User Question → answerQuestion.ts → RAG answer
```

### RAG Implementation Flow
```
Question
  ↓ getEmbedding() - OpenAI text-embedding-3-large
Embedding Vector
  ↓ pgvector similarity search (cosine distance via <=>)
Top-3 Similar Documents
  ↓ GPT-4o-mini completion with context
Answer
```

### Key Components

**Entry Points** (4 CLI executables via tsdown):
- `src/index.ts` - Embedding test
- `src/fetchPosts.ts` - Ghost CMS data fetcher
- `src/storeEmbeddings.ts` - Embedding generator & DB writer
- `src/answerQuestion.ts` - Q&A interface

**Utilities** (`src/utils/`):
- `pgClient.ts` - PostgreSQL client configuration
- `getEmbeddings.ts` - OpenAI embedding function
- `getAnswerFromGpt.ts` - Core RAG logic (search + GPT completion)
- `retry.ts` - Exponential backoff (base 1s, max 10s)
- `htmlToText.ts` - HTML to plain text conversion
- `saveJson.ts` - JSON file persistence

### Database Schema

**Table**: `anotherclass_guide`
- `slug` (text) - Post identifier
- `title` (text) - Post title
- `content` (text) - Full HTML-to-text converted content
- `updated_at` (timestamp) - Last update time
- `embedding` (vector) - OpenAI embedding (1536 dimensions for text-embedding-3-large)

**Vector Search Query** (see `getAnswerFromGpt.ts:20-26`):
```sql
SELECT slug, title, content,
       1 - (embedding <=> $1::vector) AS similarity
FROM anotherclass_guide
ORDER BY embedding <=> $1::vector
LIMIT 3
```

### AI Configuration

**Embedding Model**: `text-embedding-3-large` (OpenAI)
**LLM Model**: `gpt-4o-mini` with temperature 0.2

**System Prompt** (Korean customer support chatbot):
- Language: Korean formal polite (존댓말)
- Constraint: Only answer from provided documentation
- Strategy: Prefer newer documents when conflicts exist
- Fallback: Recommend customer service if uncertain
- See full prompt in `src/utils/getAnswerFromGpt.ts:56-75`

## Environment Variables

Required in `.env`:
```
OPENAI_API_KEY=sk-...
GHOST_API_URL=https://...
GHOST_API_KEY=...
POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=rag_chat_bot
```

## Build Configuration

**tsdown** (`tsdown.config.ts`):
- Entry: 4 files (index, fetchPosts, storeEmbeddings, answerQuestion)
- Format: ESM only
- Target: Node 20
- Output: `dist/*.mjs` with inline sourcemaps

**TypeScript** (`tsconfig.json`):
- Strict mode enabled
- Target: ES2022
- Module: ESNext (ESM)

## Data Flow

1. **Initial Setup**: Run `docker-compose up` to start PostgreSQL
2. **Fetch Data**: `npm run fetchPosts` retrieves ~140 posts from Ghost CMS
3. **Generate Embeddings**: `npm run storeEmbeddings` processes posts and stores vectors
4. **Query**: `npm run answerQuestion -- "question"` performs RAG lookup

## Important Notes

- Posts are cached in `/posts` directory (gitignored)
- Retry logic applied to OpenAI API calls (exponential backoff)
- Vector similarity uses pgvector's `<=>` cosine distance operator
- System prompt enforces documentation-grounded responses only
- All content converted from HTML to plain text before embedding
