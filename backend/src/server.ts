// src/server.ts
import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'

// Importar rutas
import authRoutes from './routes/auth'
import perfilRoutes from './routes/perfil'
import nivelesRoutes from './routes/niveles'
import subnivelesRoutes from './routes/subniveles'
import ninosRoutes from './routes/ninos'
import usuariosRoutes from './routes/usuarios'
import rolesRoutes from './routes/roles'
import facturasRoutes from './routes/facturas'
import asistenciaRoutes from './routes/asistencia'
import actividadesRoutes from './routes/actividades'
import documentosRoutes from './routes/documentos'
import reportesRoutes from './routes/reportes'

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
app.use('/auth', authRoutes)

// Rutas protegidas (authMiddleware está DENTRO de cada archivo de ruta)
app.use('/perfil', perfilRoutes)
app.use('/niveles', nivelesRoutes)
app.use('/subniveles', subnivelesRoutes)
app.use('/ninos', ninosRoutes)
app.use('/usuarios', usuariosRoutes)
app.use('/roles', rolesRoutes)
app.use('/facturas', facturasRoutes)
app.use('/asistencia', asistenciaRoutes)
app.use('/actividades', actividadesRoutes)
app.use('/documentos', documentosRoutes)
app.use('/reportes', reportesRoutes)

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
  
  console.log('📍 Rutas registradas:')
  console.log('   POST    /auth/login')
  console.log('   POST    /auth/logout')
  console.log('   GET     /auth/me')
  console.log('   GET     /perfil')
  console.log('   PUT     /perfil')
  console.log('   GET     /niveles')
  console.log('   POST    /niveles')
  console.log('   PUT     /niveles/:id')
  console.log('   DELETE  /niveles/:id')
  console.log('   GET     /subniveles')
  console.log('   GET     /ninos')
  console.log('   GET     /usuarios')
  console.log('   GET     /roles')
  console.log('   GET     /facturas')
  console.log('   GET     /asistencia')
  console.log('   GET     /actividades')
  console.log('   GET     /documentos')
  console.log('   GET     /reportes/financiero')
  console.log('   GET     /reportes/ninos')
  console.log('')
  
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