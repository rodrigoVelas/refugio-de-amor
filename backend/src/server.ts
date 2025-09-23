import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import path from 'path'

import auth from './routes/auth'
import { authMiddleware } from './core/auth_middleware'
import { errorHandler } from './core/error_handler'

// rutas ya existentes
import perfil from './routes/perfil'
import niveles from './routes/niveles'
import subniveles from './routes/subniveles'
import ninos from './routes/ninos'
import usuarios from './routes/usuarios'
import roles from './routes/roles'
import facturas from './routes/facturas'

// ⚠️ IMPORTA ESTAS DOS
import asistencia from './routes/asistencia'
import actividades from './routes/actividades'

dotenv.config()
const app = express()

app.use(cors({ origin:'http://localhost:5173', credentials:true }))
app.use(express.json())
app.use(cookieParser())

// rutas publicas
app.use('/auth', auth)

// todo lo de aqui requiere auth
app.use(authMiddleware)

// monta modulos
app.use(perfil)
app.use(niveles)
app.use(subniveles)
app.use(ninos)
app.use(usuarios)
app.use(roles)
app.use(facturas)

// ⚠️ MONTA ASISTENCIA Y ACTIVIDADES
app.use(asistencia)
app.use(actividades)

// estaticos (subidas)
app.use('/uploads', express.static(path.resolve(process.cwd(), 'uploads')))

// manejador de errores
app.use(errorHandler)

app.listen(3000, ()=> console.log('api lista en http://localhost:3000'))
