import express from 'express';
import cors, { CorsOptions } from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';

import auth from './routes/auth';
import { authMiddleware } from './core/auth_middleware';
import { errorHandler } from './core/error_handler';

// módulos
import perfil from './routes/perfil';
import niveles from './routes/niveles';
import subniveles from './routes/subniveles';
import ninos from './routes/ninos';
import usuarios from './routes/usuarios';
import roles from './routes/roles';
import facturas from './routes/facturas';
import asistencia from './routes/asistencia';
import actividades from './routes/actividades';

dotenv.config();
const app = express();

/** ===== CORS SOLO PRODUCCIÓN (Render) =====
 * Pon tu dominio de Vercel en CORS_ORIGIN (sin localhost).
 * Si quieres permitir previews, agrega *.vercel.app
 * Ej:
 *   CORS_ORIGIN="https://refugio-de-amor.vercel.app,*.vercel.app"
 */
const rawAllow = process.env.CORS_ORIGIN ?? 'https://refugio-de-amor.vercel.app';
const allowList = rawAllow.split(',').map(s => s.trim()).filter(Boolean);

function isAllowedOrigin(origin: string): boolean {
  try {
    const host = new URL(origin).hostname.toLowerCase();
    for (const p0 of allowList) {
      const p = p0.toLowerCase().replace(/\/+$/, '');
      if (p.startsWith('*.')) {
        const suffix = p.slice(2); // "vercel.app"
        if (host === suffix || host.endsWith('.' + suffix)) return true;
      } else if (!p.startsWith('http')) {
        // patrón host puro
        if (host === p || host.endsWith('.' + p.replace(/^\./, ''))) return true;
      } else if (origin.replace(/\/+$/, '') === p) {
        return true;
      }
    }
  } catch {}
  return false;
}

const corsOptions: CorsOptions = {
  origin(origin, cb) {
    if (!origin) return cb(null, true);       // healthchecks/curl
    return isAllowedOrigin(origin) ? cb(null, true) : cb(new Error('CORS'));
  },
  credentials: true,
  methods: ['GET','HEAD','PUT','PATCH','POST','DELETE'],
};

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));
app.use(express.json());
app.use(cookieParser());
app.set('trust proxy', 1);                     // cookies detrás de proxy (Render)

/** Health */
app.get('/health', (_req, res) => res.status(200).json({ ok: true }));

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

/** Estáticos (ojo, efímeros en Render) */
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')));

/** Errores */
app.use(errorHandler);

/** Arranque (Render) */
const PORT = Number(process.env.PORT ?? 3000);
const HOST = '0.0.0.0';                        // Render: escuchar en 0.0.0.0
app.listen(PORT, HOST, () => {
  console.log(`API lista en http://${HOST}:${PORT}`);
});
