// src/routes/documentos.ts
import { Router } from 'express'
import { authMiddleware } from '../core/auth_middleware'
import { requirePerms } from '../core/perm_middleware'
import { pool } from '../core/db'
import multer from 'multer'

const router = Router()

// Configurar multer para memoria
const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB máximo
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/png',
      'image/jpg',
      'image/gif',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ]
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Tipo de archivo no permitido'))
    }
  }
})

// Helper: Verificar si es directora
async function esDirectora(userId: string): Promise<boolean> {
  const result = await pool.query('SELECT rol FROM usuarios WHERE id = $1', [userId])
  const rol = String(result.rows[0]?.rol).toLowerCase()
  
  console.log('[esDirectora] Usuario:', userId, '| Rol:', rol)
  
  return rol === 'directora' || rol === '1'
}

// Helper: Determinar tipo de archivo
function detectarTipo(mimetype: string): string {
  if (mimetype === 'application/pdf') return 'pdf'
  if (mimetype.startsWith('image/')) return 'imagen'
  if (mimetype.includes('word')) return 'word'
  if (mimetype.includes('excel') || mimetype.includes('spreadsheet')) return 'excel'
  if (mimetype === 'text/plain') return 'texto'
  return 'otro'
}

// GET /documentos - Listar documentos (TODOS pueden ver)
router.get('/', authMiddleware, async (req: any, res: any) => {
  try {
    console.log('\n=== GET /documentos ===')
    console.log('Usuario:', req.user.id)

    // TODOS ven TODOS los documentos
    const query = `
      SELECT 
        d.id,
        d.titulo,
        d.descripcion,
        d.tipo,
        d.nombre_archivo,
        d.tamano_bytes,
        d.mime_type,
        d.subido_por,
        d.creado_en,
        u.nombres || ' ' || COALESCE(u.apellidos, '') as subido_por_nombre
      FROM documentos d
      LEFT JOIN usuarios u ON d.subido_por = u.id
      WHERE d.activo = true
      ORDER BY d.creado_en DESC
    `

    const result = await pool.query(query)

    console.log('✅ Documentos encontrados:', result.rows.length)
    console.log('===================\n')

    res.json(result.rows)
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    res.status(500).json({ error: 'Error al listar documentos' })
  }
})

// POST /documentos - Subir documento (SOLO DIRECTORA)
router.post('/', authMiddleware, upload.single('archivo'), async (req: any, res: any) => {
  try {
    const { titulo, descripcion } = req.body
    const userId = req.user.id
    const file = req.file

    console.log('\n=== POST /documentos ===')
    console.log('Usuario:', userId)

    // Verificar que sea directora
    const esDir = await esDirectora(userId)
    if (!esDir) {
      console.log('❌ Acceso denegado - No es directora')
      return res.status(403).json({ error: 'Solo la directora puede subir documentos' })
    }

    console.log('✅ Usuario es directora')

    if (!file) {
      return res.status(400).json({ error: 'No se recibió archivo' })
    }

    if (!titulo || !titulo.trim()) {
      return res.status(400).json({ error: 'El título es requerido' })
    }

    console.log('📎 Archivo:', file.originalname)
    console.log('   Tipo MIME:', file.mimetype)
    console.log('   Tamaño:', (file.size / 1024).toFixed(2), 'KB')

    const tipo = detectarTipo(file.mimetype)
    console.log('   Tipo detectado:', tipo)

    // Convertir buffer a Base64
    const contenidoBase64 = file.buffer.toString('base64')

    // Guardar en BD
    const result = await pool.query(
      `INSERT INTO documentos 
        (titulo, descripcion, tipo, nombre_archivo, tamano_bytes, mime_type, contenido_base64, subido_por, activo, creado_en)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, NOW())
      RETURNING id, titulo, tipo, nombre_archivo, tamano_bytes, creado_en`,
      [
        titulo.trim(),
        descripcion?.trim() || null,
        tipo,
        file.originalname,
        file.size,
        file.mimetype,
        contenidoBase64,
        userId
      ]
    )

    console.log('✅ Documento guardado:', result.rows[0].id)
    console.log('===================\n')

    res.json({ ok: true, documento: result.rows[0] })
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    res.status(500).json({ error: error.message || 'Error al subir documento' })
  }
})

// GET /documentos/:id - Ver documento específico (TODOS pueden ver)
router.get('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params

    const query = `
      SELECT 
        d.*,
        u.nombres || ' ' || COALESCE(u.apellidos, '') as subido_por_nombre
      FROM documentos d
      LEFT JOIN usuarios u ON d.subido_por = u.id
      WHERE d.id = $1 AND d.activo = true
    `

    const result = await pool.query(query, [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Documento no encontrado' })
    }

    res.json(result.rows[0])
  } catch (error: any) {
    console.error('Error:', error)
    res.status(500).json({ error: 'Error al obtener documento' })
  }
})

// GET /documentos/:id/descargar - Descargar archivo (TODOS pueden descargar)
router.get('/:id/descargar', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params

    const query = `
      SELECT 
        d.contenido_base64,
        d.nombre_archivo,
        d.mime_type
      FROM documentos d
      WHERE d.id = $1 AND d.activo = true
    `

    const result = await pool.query(query, [id])

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Documento no encontrado' })
    }

    const doc = result.rows[0]

    // Convertir Base64 a Buffer
    const buffer = Buffer.from(doc.contenido_base64, 'base64')

    // Enviar como descarga
    res.setHeader('Content-Type', doc.mime_type)
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(doc.nombre_archivo)}"`)
    res.send(buffer)
  } catch (error: any) {
    console.error('Error:', error)
    res.status(500).json({ error: 'Error al descargar documento' })
  }
})

// DELETE /documentos/:id - Eliminar documento (SOLO DIRECTORA)
router.delete('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    // Verificar que sea directora
    const esDir = await esDirectora(userId)
    if (!esDir) {
      return res.status(403).json({ error: 'Solo la directora puede eliminar documentos' })
    }

    const check = await pool.query('SELECT id FROM documentos WHERE id = $1 AND activo = true', [id])

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Documento no encontrado' })
    }

    // Marcar como inactivo
    await pool.query('UPDATE documentos SET activo = false WHERE id = $1', [id])

    console.log('🗑️ Documento eliminado:', id)

    res.json({ ok: true })
  } catch (error: any) {
    console.error('Error:', error.message)
    res.status(500).json({ error: error.message })
  }
})

export default router