// backend/src/server.ts
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';

// rutas
import auth from './routes/auth';
import { authMiddleware } from './core/auth_middleware';
import { errorHandler } from './core/error_handler';

import perfil from './routes/perfil';
import niveles from './routes/niveles';
import subniveles from './routes/subniveles';
import ninos from './routes/ninos';
import usuarios from './routes/usuarios';
import roles from './routes/roles';
import facturas from './routes/facturas';
import asistencia from './routes/asistencia';
import actividades from './routes/actividades';
import { pool } from './core/db';

dotenv.config();

const app = express();
const isProd = process.env.NODE_ENV === 'production';

// cuando estamos detrás de proxy (Render) para que "secure" y samesite=none funcionen
app.set('trust proxy', 1);

// parsers
app.use(cookieParser());
app.use(express.json());

// CORS: en dev permitimos todo; en prod aceptamos la lista de orígenes
// Define CORS_ORIGIN="https://refugio-de-amor.vercel.app,*.vercel.app"
const rawAllow = process.env.CORS_ORIGIN ?? 'https://refugio-de-amor.vercel.app';
const allowList = rawAllow.split(',').map(s => s.trim()).filter(Boolean);

function isAllowedOrigin(origin: string) {
  try {
    const host = new URL(origin).hostname.toLowerCase();
    for (const pat0 of allowList) {
      const pat = pat0.toLowerCase().replace(/\/+$/, '');
      if (pat.startsWith('*.')) {
        const suffix = pat.slice(2);
        if (host === suffix || host.endsWith('.' + suffix)) return true;
      } else if (!pat.startsWith('http')) {
        if (host === pat || host.endsWith('.' + pat.replace(/^\./, ''))) return true;
      } else if (origin.replace(/\/+$/, '') === pat) {
        return true;
      }
    }
  } catch {}
  return false;
}

app.use(cors({
  origin(origin, cb) {
    if (!origin) return cb(null, true); // curl/health checks
    if (!isProd) return cb(null, true); // dev: todo permitido
    return isAllowedOrigin(origin) ? cb(null, true) : cb(new Error('CORS'));
  },
  credentials: true,
  methods: ['GET','HEAD','PUT','PATCH','POST','DELETE'],
}));

app.options('*', cors({ origin: true, credentials: true }));

/** Health */
app.get('/health', (_req, res) => res.status(200).json({ ok: true }));

/** DB ping simple (para probar conexión a Postgres) */
app.get('/db/ping', async (_req, res, next) => {
  try {
    const r = await pool.query('select 1 as ok');
    res.json({ ok: r.rows[0]?.ok === 1 });
  } catch (e) { next(e); }
});

/** Públicas */
app.use('/auth', auth);

/** Protegidas */
app.use(authMiddleware);
app.use(perfil);
app.use(niveles);
app.use(subniveles);
app.use(ninos);
app.use(usuarios);
app.use(roles);
app.use(facturas);
app.use(asistencia);
app.use(actividades);

/** Estáticos (nota: almacenamiento efímero en Render) */
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

/** Errores */
app.use(errorHandler);

/** Arranque */
const PORT = Number(process.env.PORT ?? 3000);
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`API lista en http://${HOST}:${PORT}`);
});
