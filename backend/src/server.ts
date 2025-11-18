// src/server.ts
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

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

// CORS
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:4173',
  'https://refugio-app-crud2.vercel.app',
  'https://refugio-de-amor.vercel.app',
  /^https:\/\/refugio-app-crud2-.*\.vercel\.app$/,
  /^https:\/\/refugio-de-amor-.*\.vercel\.app$/,
]

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true)
      
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
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
)

// Middlewares
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))
app.use(cookieParser())

// Logging
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

app.get('/health', (req, res) => {
  res.json({ 
    ok: true, 
    status: 'healthy',
    timestamp: new Date().toISOString()
  })
})

// ==================== RUTAS ====================

// Rutas públicas
app.use('/auth', auth)

// Rutas protegidas (authMiddleware está DENTRO de cada archivo de ruta)
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

// 404
app.use((req, res) => {
  console.log('❌ 404:', req.method, req.path)
  res.status(404).json({ 
    error: 'Ruta no encontrada',
    path: req.path,
    method: req.method
  })
})

// Error handler
app.use((err: any, req: any, res: any, next: any) => {
  console.error('❌ Error:', err)
  res.status(500).json({ 
    error: 'Error interno del servidor',
    message: err.message 
  })
})

// Start
app.listen(PORT, () => {
  console.log(`\n✅ API lista en http://0.0.0.0:${PORT}\n`)
  
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'super_secreto') {
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