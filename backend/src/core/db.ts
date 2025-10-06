// src/lib/db.ts
import { Pool, PoolConfig } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// Opción 1: Usar DATABASE_URL si existe
let connectionString = process.env.DATABASE_URL;

// Opción 2: Construir desde variables individuales
if (!connectionString) {
  const { PGUSER, PGPASSWORD, PGHOST, PGPORT, PGDATABASE } = process.env;
  
  if (!PGUSER || !PGPASSWORD || !PGHOST || !PGPORT || !PGDATABASE) {
    throw new Error('Faltan variables de entorno de PostgreSQL');
  }
  
  connectionString = `postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}:${PGPORT}/${PGDATABASE}`;
}

// Detectar si se requiere SSL
const sslRequired =
  /\bsslmode=require\b/i.test(connectionString) || 
  process.env.DB_SSL === 'true';

const config: PoolConfig = {
  connectionString,
  ssl: sslRequired ? { rejectUnauthorized: false } : false,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
};

export const pool = new Pool(config);

// Eventos de conexión
pool.on('connect', () => {
  console.log('✅ Conectado a PostgreSQL');
});

pool.on('error', (err) => {
  console.error('❌ Error en el pool de PostgreSQL:', err);
});

// Función de prueba
export async function testConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW()');
    console.log('🔌 Conexión exitosa:', result.rows[0]);
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Error al conectar:', error);
    return false;
  }
}