import express from 'express'
import cors, { CorsOptions } from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import path from 'path'

import auth from './routes/auth'
import { authMiddleware } from './core/auth_middleware'
import { errorHandler } from './core/error_handler'

// módulos
import perfil from './routes/perfil'
import niveles from './routes/niveles'
import subniveles from './routes/subniveles'
import ninos from './routes/ninos'
import usuarios from './routes/usuarios'
import roles from './routes/roles'
import facturas from './routes/facturas'
import asistencia from './routes/asistencia'
import actividades from './routes/actividades'

dotenv.config()

const app = express()

/** ===== CORS (Vercel + local) =====
 * Seteá CORS_ORIGIN en Render con tus orígenes separados por coma.
 * Ej: "https://tu-frontend.vercel.app,http://localhost:5173"
 * También soporta comodín "*.vercel.app".
 */
const rawAllow = process.env.CORS_ORIGIN ?? '*.vercel.app,http://localhost:5173'
const allowList = rawAllow.split(',').map(s => s.trim()).filter(Boolean)

const corsOptions: CorsOptions = {
  origin(origin, cb) {
    // permitir requests de herramientas (curl, health, etc.)
    if (!origin) return cb(null, true)

    const ok = allowList.some(p => {
      if (p.startsWith('*.')) {
        // *.vercel.app
        const wild = p.slice(1) // ".vercel.app"
        return origin.endsWith(wild)
      }
      return origin === p
    })

    return ok ? cb(null, true) : cb(new Error('Not allowed by CORS'))
  },
  credentials: true,
  methods: ['GET','HEAD','PUT','PATCH','POST','DELETE'],
  allowedHeaders: ['Content-Type','Authorization']
}

app.use(cors(corsOptions))
app.options('*', cors(corsOptions)) // preflight
app.use(express.json())
app.use(cookieParser())

// Si usás cookies/sesiones detrás de proxy (Render), activá trust proxy
app.set('trust proxy', 1)

/** ===== Healthcheck público (sin auth) ===== */
app.get('/health', (_req, res) => res.status(200).json({ ok: true }))

/** ===== Rutas públicas ===== */
app.use('/auth', auth)

/** ===== Todo lo de abajo requiere auth ===== */
app.use(authMiddleware)

app.use(perfil)
app.use(niveles)
app.use(subniveles)
app.use(ninos)
app.use(usuarios)
app.use(roles)
app.use(facturas)
app.use(asistencia)
app.use(actividades)

/** ===== Archivos estáticos =====
 * Ojo: en Render el filesystem es efímero. Usá S3/Cloudinary para persistencia.
 */
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')))

/** ===== Manejador de errores (SIEMPRE al final) ===== */
app.use(errorHandler)

/** ===== Arranque ===== */
const PORT = Number(process.env.PORT ?? 3000)
// En Render tenés que escuchar en 0.0.0.0
const HOST = process.env.HOST ?? '0.0.0.0'

app.listen(PORT, HOST, () => {
  console.log(`API lista en http://${HOST}:${PORT}`)
})
