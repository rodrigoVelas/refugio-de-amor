// src/routes/documentos.ts
import { Router, Request, Response } from 'express'
import { authMiddleware } from '../core/auth_middleware'
import { requirePerms } from '../core/perm_middleware'
import { pool } from '../core/db'
import multer from 'multer'
import cloudinary from '../lib/cloudinary'
import { Readable } from 'stream'

const router = Router()

// Configurar multer para memoria
const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB máximo
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ]
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo PDF, Word y Excel.'))
    }
  },
})

// Helper: subir a Cloudinary
async function uploadToCloudinary(buffer: Buffer, filename: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'refugio_documentos',
        resource_type: 'raw',
        public_id: `${Date.now()}_${filename.replace(/\.[^/.]+$/, '')}`,
      },
      (error, result) => {
        if (error) {
          console.error('[uploadToCloudinary] Error:', error)
          reject(error)
        } else {
          console.log('[uploadToCloudinary] Success:', result?.secure_url)
          resolve(result)
        }
      }
    )

    const readableStream = new Readable()
    readableStream.push(buffer)
    readableStream.push(null)
    readableStream.pipe(uploadStream)
  })
}

// GET /documentos - Listar todos los documentos (todos pueden ver)
router.get('/', authMiddleware, async (req: any, res: any) => {
  try {
    const { mes, anio } = req.query

    let query = `
      SELECT 
        d.*,
        u.nombres || ' ' || COALESCE(u.apellidos, '') as subido_por_nombre
      FROM documentos_mensuales d
      LEFT JOIN usuarios u ON d.subido_por = u.id
      WHERE 1=1
    `
    const params: any[] = []

    if (mes) {
      params.push(mes)
      query += ` AND d.mes = $${params.length}`
    }

    if (anio) {
      params.push(anio)
      query += ` AND d.anio = $${params.length}`
    }

    query += ' ORDER BY d.anio DESC, d.mes DESC, d.fecha_subida DESC'

    const result = await pool.query(query, params)
    console.log(`[documentos/list] Encontrados: ${result.rows.length}`)
    res.json(result.rows)
  } catch (error: any) {
    console.error('[documentos/list] Error:', error)
    res.status(500).json({ error: 'Error al listar documentos' })
  }
})

// GET /documentos/:id - Ver un documento específico
router.get('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params

    const result = await pool.query(
      `
      SELECT 
        d.*,
        u.nombres || ' ' || COALESCE(u.apellidos, '') as subido_por_nombre
      FROM documentos_mensuales d
      LEFT JOIN usuarios u ON d.subido_por = u.id
      WHERE d.id = $1
      `,
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Documento no encontrado' })
    }

    res.json(result.rows[0])
  } catch (error: any) {
    console.error('[documentos/get] Error:', error)
    res.status(500).json({ error: 'Error al obtener documento' })
  }
})

// POST /documentos/upload - Subir nuevo documento (solo directora)
router.post(
  '/upload',
  authMiddleware,
  requirePerms(['documentos_subir']),
  upload.single('archivo'),
  async (req: any, res: any) => {
    try {
      const { titulo, descripcion, mes, anio } = req.body
      const file = req.file

      if (!file) {
        return res.status(400).json({ error: 'No se subió ningún archivo' })
      }

      if (!titulo || !mes || !anio) {
        return res.status(400).json({ error: 'Título, mes y año son requeridos' })
      }

      console.log('[documentos/upload] Subiendo a Cloudinary...')
      const cloudinaryResult = await uploadToCloudinary(file.buffer, file.originalname)

      // Guardar en BD
      const result = await pool.query(
        `
        INSERT INTO documentos_mensuales 
          (titulo, descripcion, archivo_nombre, archivo_tipo, archivo_size, archivo_url, mes, anio, subido_por)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
        `,
        [
          titulo,
          descripcion || null,
          file.originalname,
          file.mimetype,
          file.size,
          cloudinaryResult.secure_url,
          parseInt(mes),
          parseInt(anio),
          req.user.id,
        ]
      )

      console.log('[documentos/upload] Documento guardado:', result.rows[0].id)
      res.json({ ok: true, documento: result.rows[0] })
    } catch (error: any) {
      console.error('[documentos/upload] Error:', error)
      res.status(500).json({ error: error.message || 'Error al subir documento' })
    }
  }
)

// PUT /documentos/:id - Actualizar documento (solo directora)
router.put(
  '/:id',
  authMiddleware,
  requirePerms(['documentos_editar']),
  async (req: any, res: any) => {
    try {
      const { id } = req.params
      const { titulo, descripcion, mes, anio } = req.body

      if (!titulo || !mes || !anio) {
        return res.status(400).json({ error: 'Título, mes y año son requeridos' })
      }

      const result = await pool.query(
        `
        UPDATE documentos_mensuales
        SET titulo = $1, descripcion = $2, mes = $3, anio = $4
        WHERE id = $5
        RETURNING *
        `,
        [titulo, descripcion || null, parseInt(mes), parseInt(anio), id]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Documento no encontrado' })
      }

      console.log('[documentos/update] Documento actualizado:', id)
      res.json({ ok: true, documento: result.rows[0] })
    } catch (error: any) {
      console.error('[documentos/update] Error:', error)
      res.status(500).json({ error: 'Error al actualizar documento' })
    }
  }
)

// DELETE /documentos/:id - Eliminar documento (solo directora)
router.delete(
  '/:id',
  authMiddleware,
  requirePerms(['documentos_eliminar']),
  async (req: any, res: any) => {
    try {
      const { id } = req.params

      // Obtener URL del archivo
      const doc = await pool.query('SELECT archivo_url FROM documentos_mensuales WHERE id = $1', [id])

      if (doc.rows.length === 0) {
        return res.status(404).json({ error: 'Documento no encontrado' })
      }

      // Eliminar de Cloudinary
      const url = doc.rows[0].archivo_url
      const publicIdMatch = url.match(/refugio_documentos\/([^/]+)/)

      if (publicIdMatch) {
        const publicId = `refugio_documentos/${publicIdMatch[1]}`
        try {
          await cloudinary.uploader.destroy(publicId, { resource_type: 'raw' })
          console.log('[documentos/delete] Archivo eliminado de Cloudinary:', publicId)
        } catch (cloudError) {
          console.error('[documentos/delete] Error eliminando de Cloudinary:', cloudError)
        }
      }

      // Eliminar de BD
      await pool.query('DELETE FROM documentos_mensuales WHERE id = $1', [id])

      console.log('[documentos/delete] Documento eliminado:', id)
      res.json({ ok: true })
    } catch (error: any) {
      console.error('[documentos/delete] Error:', error)
      res.status(500).json({ error: 'Error al eliminar documento' })
    }
  }
)

export default router