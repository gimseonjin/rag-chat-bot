import { Pool, type PoolConfig } from 'pg';

const config: PoolConfig = {
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'rag_practice',
};

const pgClient = new Pool(config);

export { pgClient };