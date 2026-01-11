import { Client, type ClientConfig } from 'pg';

const config: ClientConfig = {
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: 'postgres',
  database: 'rag_practice',
};

const pgClient = new Client(config);

export { pgClient };