import pg from 'pg'
import dotenv from 'dotenv'
dotenv.config()
export const pool = new pg.Pool({ connectionString: process.env.database_url, ssl: process.env.db_ssl==='true'?{rejectUnauthorized:false}:undefined } as any)
