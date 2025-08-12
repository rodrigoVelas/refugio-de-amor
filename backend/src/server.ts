import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import dotenv from 'dotenv'
import auth from './routes/auth'
import perfil from './routes/perfil'
import niveles from './routes/niveles'
import subniveles from './routes/subniveles'
import ninos from './routes/ninos'
import usuarios from './routes/usuarios'
import { authMiddleware } from './core/auth_middleware'
import { errorHandler } from './core/error_handler'

dotenv.config()
const app = express()

app.use(cors({ origin:'http://localhost:5173', credentials:true }))
app.use(express.json())
app.use(cookieParser())

app.use('/auth', auth)
app.use(authMiddleware)
app.use(perfil)
app.use(niveles)
app.use(subniveles)
app.use(ninos)
app.use(usuarios)

app.use(errorHandler)
app.listen(3000, ()=> console.log('api lista en http://localhost:3000'))
