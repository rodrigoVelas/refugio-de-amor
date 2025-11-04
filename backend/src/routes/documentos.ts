// src/routes/documentos.ts
import { Router } from 'express'
import { pool } from '../core/db'
import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary'
import { Readable } from 'stream'

const router = Router()

// Configurar Cloudinary
console.log('🔧 Configurando Cloudinary...')
if (process.env.CLOUDINARY_URL) {
  cloudinary.config({
    cloudinary_url: process.env.CLOUDINARY_URL
  })
  console.log('✅ Cloudinary configurado')
} else {
  console.error('❌ CLOUDINARY_URL NO ESTÁ CONFIGURADO')
}

// Configurar multer
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    console.log('📎 Multer recibió archivo:', file.originalname, file.mimetype)
    cb(null, true)
  }
})

// Helper: Subir a Cloudinary
async function subirACloudinary(buffer: Buffer, filename: string): Promise<string> {
  console.log('☁️  Iniciando subida a Cloudinary:', filename)
  console.log('   Buffer size:', buffer.length, 'bytes')

  return new Promise((resolve, reject) => {
    const ext = filename.split('.').pop()?.toLowerCase() || ''
    const resourceType = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) ? 'image' : 'raw'

    console.log('   Extension:', ext)
    console.log('   Resource type:', resourceType)

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'refugio_documentos',
        resource_type: resourceType,
        public_id: `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      },
      (error, result) => {
        if (error) {
          console.error('❌ Error en Cloudinary:', error)
          reject(error)
        } else {
          console.log('✅ Subido exitosamente:', result?.secure_url)
          resolve(result?.secure_url || '')
        }
      }
    )

    const readable = new Readable()
    readable.push(buffer)
    readable.push(null)
    readable.pipe(uploadStream)
  })
}

// Helper: Verificar si es directora
async function esDirectora(userId: string): Promise<boolean> {
  try {
    const result = await pool.query('SELECT rol FROM usuarios WHERE id = $1', [userId])
    const rol = String(result.rows[0]?.rol).toLowerCase()
    console.log('👑 Verificando rol - Usuario:', userId, '| Rol:', rol)
    return rol === 'directora'
  } catch (error) {
    console.error('❌ Error verificando rol:', error)
    return false
  }
}

// Helper: Detectar tipo de archivo
function detectarTipo(mimetype: string): string {
  if (mimetype === 'application/pdf') return 'application/pdf'
  if (mimetype.startsWith('image/')) return mimetype
  if (mimetype.includes('word')) return 'application/msword'
  if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return 'application/vnd.ms-excel'
  return mimetype
}

// GET /documentos - Listar todos
router.get('/', async (req: any, res: any) => {
  try {
    console.log('\n📄 GET /documentos')
    console.log('Usuario:', req.user?.email)

    const query = `
      SELECT 
        d.id,
        d.titulo,
        d.descripcion,
        d.archivo_nombre,
        d.archivo_tipo,
        d.archivo_size,
        d.archivo_url,
        d.mes,
        d.anio,
        d.subido_por,
        d.fecha_subida,
        u.nombres || ' ' || COALESCE(u.apellidos, '') as subido_por_nombre
      FROM documentos_mensuales d
      LEFT JOIN usuarios u ON d.subido_por = u.id
      WHERE d.activo = true
      ORDER BY d.fecha_subida DESC
    `

    const result = await pool.query(query)
    console.log('✅ Encontrados:', result.rows.length)

    res.json(result.rows)
  } catch (error: any) {
    console.error('❌ Error en GET /documentos:', error.message)
    res.status(500).json({ error: 'Error al listar documentos' })
  }
})

// POST /documentos - Subir nuevo documento
router.post('/', upload.single('archivo'), async (req: any, res: any) => {
  console.log('\n\n🚀 ========== INICIO POST /documentos ==========')
  
  try {
    console.log('1️⃣ Request recibido')
    console.log('   Body:', req.body)
    console.log('   File:', req.file ? 'SÍ' : 'NO')
    console.log('   User:', req.user?.email)

    const { titulo, descripcion } = req.body
    const userId = req.user?.id
    const file = req.file

    if (!userId) {
      console.log('❌ No hay userId')
      return res.status(401).json({ error: 'No autenticado' })
    }

    console.log('2️⃣ Verificando si es directora...')
    const esDir = await esDirectora(userId)
    console.log('   Resultado:', esDir)

    if (!esDir) {
      console.log('❌ Usuario no es directora')
      return res.status(403).json({ error: 'Solo la directora puede subir documentos' })
    }

    if (!file) {
      console.log('❌ No hay archivo')
      return res.status(400).json({ error: 'No se recibió archivo' })
    }

    console.log('3️⃣ Archivo recibido:')
    console.log('   Nombre:', file.originalname)
    console.log('   Tipo:', file.mimetype)
    console.log('   Tamaño:', file.size, 'bytes')

    if (!titulo?.trim()) {
      console.log('❌ No hay título')
      return res.status(400).json({ error: 'El título es requerido' })
    }

    console.log('4️⃣ Subiendo a Cloudinary...')
    const archivoUrl = await subirACloudinary(file.buffer, file.originalname)
    console.log('   URL obtenida:', archivoUrl)

    const archivoTipo = detectarTipo(file.mimetype)
    const fechaActual = new Date()
    const mes = fechaActual.getMonth() + 1
    const anio = fechaActual.getFullYear()

    console.log('5️⃣ Guardando en base de datos...')
    console.log('   Titulo:', titulo.trim())
    console.log('   Archivo URL:', archivoUrl)
    console.log('   Mes/Año:', mes, '/', anio)

    const result = await pool.query(
      `INSERT INTO documentos_mensuales 
        (titulo, descripcion, archivo_nombre, archivo_tipo, archivo_size, archivo_url, mes, anio, subido_por, fecha_subida, activo)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), true)
      RETURNING id, titulo, archivo_nombre, archivo_url, fecha_subida`,
      [
        titulo.trim(),
        descripcion?.trim() || null,
        file.originalname,
        archivoTipo,
        file.size,
        archivoUrl,
        mes,
        anio,
        userId
      ]
    )

    console.log('✅ Documento guardado exitosamente!')
    console.log('   ID:', result.rows[0].id)
    console.log('🎉 ========== FIN POST /documentos ==========\n\n')

    res.json({ ok: true, documento: result.rows[0] })
  } catch (error: any) {
    console.error('❌❌❌ ERROR CRÍTICO:', error)
    console.error('Stack:', error.stack)
    console.log('🔥 ========== ERROR POST /documentos ==========\n\n')
    res.status(500).json({ error: error.message || 'Error al subir documento' })
  }
})

// GET /documentos/:id - Ver uno específico
router.get('/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params

    const result = await pool.query(
      `SELECT 
        d.*,
        u.nombres || ' ' || COALESCE(u.apellidos, '') as subido_por_nombre
       FROM documentos_mensuales d
       LEFT JOIN usuarios u ON d.subido_por = u.id
       WHERE d.id = $1 AND d.activo = true`,
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Documento no encontrado' })
    }

    res.json(result.rows[0])
  } catch (error: any) {
    console.error('Error:', error)
    res.status(500).json({ error: 'Error al obtener documento' })
  }
})

// DELETE /documentos/:id - Eliminar
router.delete('/:id', async (req: any, res: any) => {
  try {
    const { id } = req.params
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ error: 'No autenticado' })
    }

    const esDir = await esDirectora(userId)
    if (!esDir) {
      return res.status(403).json({ error: 'Solo la directora puede eliminar' })
    }

    const check = await pool.query(
      'SELECT id, archivo_url FROM documentos_mensuales WHERE id = $1 AND activo = true',
      [id]
    )

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Documento no encontrado' })
    }

    // Intentar eliminar de Cloudinary
    try {
      const url = check.rows[0].archivo_url
      const publicId = url.split('/').slice(-2).join('/').split('.')[0]
      await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' })
        .catch(() => cloudinary.uploader.destroy(publicId, { resource_type: 'image' }))
    } catch (e) {
      console.log('⚠️  No se pudo eliminar de Cloudinary')
    }

    await pool.query('UPDATE documentos_mensuales SET activo = false WHERE id = $1', [id])

    console.log('🗑️  Eliminado:', id)
    res.json({ ok: true })
  } catch (error: any) {
    console.error('Error:', error.message)
    res.status(500).json({ error: error.message })
  }
})

export default router