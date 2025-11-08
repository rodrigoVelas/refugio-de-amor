// src/server.ts
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import { authMiddleware } from './core/auth_middleware'

// Importar rutas
import auth from './routes/auth'
import perfil from './routes/perfil'
import niveles from './routes/niveles'
import subniveles from './routes/subniveles'
import ninos from './routes/ninos'
import usuarios from './routes/usuarios'
import roles from './routes/roles'
import facturas from './routes/facturas'
import asistencia from './routes/asistencia'
import actividades from './routes/actividades'
import documentos from './routes/documentos'
import reportes from './routes/reportes'

const app = express()
const PORT = process.env.PORT || 3000

// CORS - Permitir frontend
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://refugio-app-crud2.vercel.app',
  'https://refugio-de-amor.vercel.app', // ← AÑADIDO
  /^https:\/\/refugio-app-crud2-.*\.vercel\.app$/,
  /^https:\/\/refugio-de-amor-.*\.vercel\.app$/, // ← AÑADIDO
]

app.use(
  cors({
    origin: (origin, callback) => {
      // Permitir requests sin origin (mobile apps, Postman, etc)
      if (!origin) return callback(null, true)
      
      // Verificar si el origin está en la lista o coincide con los regex
      const isAllowed = allowedOrigins.some(allowed => {
        if (typeof allowed === 'string') {
          return allowed === origin
        }
        return allowed.test(origin)
      })

      if (isAllowed) {
        callback(null, true)
      } else {
        console.warn('❌ CORS bloqueado para:', origin)
        callback(new Error('No permitido por CORS'))
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)

// Middlewares globales
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))
app.use(cookieParser())

// Logging de requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`)
  next()
})

// Health check
app.get('/', (req, res) => {
  res.json({ 
    ok: true, 
    message: 'API Refugio de Amor',
    timestamp: new Date().toISOString()
  })
})

// Rutas públicas (sin autenticación)
app.use('/auth', auth)

// Middleware de autenticación para todas las rutas siguientes
app.use(authMiddleware)

// Rutas protegidas (requieren autenticación)
app.use(perfil)
app.use('/niveles', niveles)
app.use('/subniveles', subniveles)
app.use('/ninos', ninos)
app.use('/usuarios', usuarios)
app.use('/roles', roles)
app.use('/facturas', facturas)
app.use('/asistencia', asistencia)
app.use('/actividades', actividades)
app.use('/documentos', documentos)
app.use('/reportes', reportes)

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' })
})

// Manejo de errores global
app.use((err: any, req: any, res: any, next: any) => {
  console.error('❌ Error no manejado:', err)
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: err.message 
  })
})

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ API lista en http://0.0.0.0:${PORT}`)
  
  // Verificar variables de entorno críticas
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'tu_secreto_super_seguro_aqui') {
    console.warn('⚠️  JWT_SECRET no está configurado correctamente')
  }
  
  if (!process.env.CLOUDINARY_URL) {
    console.warn('⚠️  CLOUDINARY_URL no está configurado')
  } else {
    const cloudName = process.env.CLOUDINARY_URL.match(/cloudinary:\/\/.*@(.+)/)?.[1]
    console.log(`☁️  Cloudinary configurado: ${cloudName}`)
  }
})

export default app