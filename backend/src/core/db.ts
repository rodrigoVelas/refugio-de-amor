// src/lib/db.ts
import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error('DATABASE_URL is missing');
}

// Activa SSL si la URL trae ?sslmode=require o si forzás con DB_SSL=true
const sslRequired =
  /\bsslmode=require\b/i.test(connectionString) || process.env.DB_SSL === 'true';

const config: PoolConfig = {
  connectionString,
  ssl: sslRequired ? { rejectUnauthorized: false } : undefined,
  // Opcional: tuning
  // max: 10,
  // idleTimeoutMillis: 30000,
  // connectionTimeoutMillis: 5000,
};

export const pool = new Pool(config);
