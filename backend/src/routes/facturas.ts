// src/routes/facturas.ts
import { Router, Request, Response } from 'express'
import multer from 'multer'
import { pool } from '../core/db'
import { getUserPerms } from '../core/rbac'
import cloudinary from '../lib/cloudinary'
import { Readable } from 'stream'

const r = Router()

// Configurar multer para memoria (no guardar en disco)
const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Solo se permiten imágenes (JPG, PNG) o PDF'))
    }
  },
})

// Helper: subir a Cloudinary
async function uploadToCloudinary(buffer: Buffer, filename: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'refugio_facturas',
        resource_type: 'auto',
        public_id: `${Date.now()}_${filename.replace(/\.[^/.]+$/, '')}`,
      },
      (error, result) => {
        if (error) reject(error)
        else resolve(result)
      }
    )

    const readableStream = new Readable()
    readableStream.push(buffer)
    readableStream.push(null)
    readableStream.pipe(uploadStream)
  })
}

// GET /facturas - Listar facturas según permisos
r.get('/facturas', async (req: any, res: any) => {
  try {
    const userId = req.user.id
    const perms = await getUserPerms(userId)
    const verTodas = perms.includes('facturas_ver_todas')

    const sql = verTodas
      ? `SELECT f.*, u.email, u.nombres || ' ' || COALESCE(u.apellidos, '') as nombre_completo 
         FROM facturas f 
         JOIN usuarios u ON u.id = f.usuario_id 
         ORDER BY f.creado_en DESC 
         LIMIT 500`
      : `SELECT f.*, u.email, u.nombres || ' ' || COALESCE(u.apellidos, '') as nombre_completo 
         FROM facturas f 
         JOIN usuarios u ON u.id = f.usuario_id 
         WHERE f.usuario_id = $1 
         ORDER BY f.creado_en DESC 
         LIMIT 500`

    const params: any[] = verTodas ? [] : [userId]
    const { rows } = await pool.query(sql, params)
    
    console.log(`[facturas/list] Usuario ${userId} - Ver todas: ${verTodas} - Encontradas: ${rows.length}`)
    res.json(rows)
  } catch (error: any) {
    console.error('[facturas/list] Error:', error)
    res.status(500).json({ error: 'Error al listar facturas' })
  }
})

// POST /facturas/upload - Subir factura a Cloudinary
r.post('/facturas/upload', upload.single('imagen'), async (req: any, res: any) => {
  try {
    const userId = req.user.id
    const perms = await getUserPerms(userId)

    if (!perms.includes('facturas_subir')) {
      return res.status(403).json({ error: 'No autorizado' })
    }

    if (!req.file) {
      return res.status(400).json({ error: 'Imagen requerida' })
    }

    const { descripcion, total, fecha } = req.body

    console.log('[facturas/upload] Subiendo a Cloudinary...')
    const cloudinaryResult = await uploadToCloudinary(req.file.buffer, req.file.originalname)

    // Guardar en BD con URL de Cloudinary
    const { rows } = await pool.query(
      `
      INSERT INTO facturas (usuario_id, descripcion, imagen_path, imagen_mime, total, fecha)
      VALUES ($1, $2, $3, $4, $5, $6) 
      RETURNING *
      `,
      [
        userId,
        descripcion || null,
        cloudinaryResult.secure_url, // URL de Cloudinary
        req.file.mimetype,
        total ? Number(total) : null,
        fecha || null,
      ]
    )

    console.log('[facturas/upload] Factura guardada:', rows[0].id)
    res.json(rows[0])
  } catch (error: any) {
    console.error('[facturas/upload] Error:', error)
    res.status(500).json({ error: error.message || 'Error al subir factura' })
  }
})

// GET /facturas/:id/imagen - Ver imagen (ahora redirige a Cloudinary)
r.get('/facturas/:id/imagen', async (req: any, res: any) => {
  try {
    const userId = req.user.id
    const perms = await getUserPerms(userId)
    
    const { rows } = await pool.query('SELECT * FROM facturas WHERE id = $1', [req.params.id])
    const f = rows[0]
    
    if (!f) {
      return res.status(404).json({ error: 'Factura no encontrada' })
    }

    const esPropia = f.usuario_id === userId
    
    if (!(perms.includes('facturas_ver_todas') || esPropia)) {
      return res.status(403).json({ error: 'No autorizado' })
    }

    // Redirigir a la URL de Cloudinary
    res.redirect(f.imagen_path)
  } catch (error: any) {
    console.error('[facturas/imagen] Error:', error)
    res.status(500).json({ error: 'Error al obtener imagen' })
  }
})

// PUT /facturas/:id - Actualizar factura (solo dueño)
r.put('/facturas/:id', async (req: any, res: any) => {
  try {
    const userId = req.user.id
    const { rows } = await pool.query('SELECT * FROM facturas WHERE id = $1', [req.params.id])
    const f = rows[0]
    
    if (!f) {
      return res.status(404).json({ error: 'Factura no encontrada' })
    }
    
    if (f.usuario_id !== userId) {
      return res.status(403).json({ error: 'No autorizado' })
    }

    const { descripcion, total, fecha } = req.body
    const q = `
      UPDATE facturas SET
        descripcion = COALESCE($1, descripcion),
        total = $2,
        fecha = COALESCE($3, fecha),
        modificado_en = NOW()
      WHERE id = $4
      RETURNING *
    `
    const u = await pool.query(q, [
      descripcion ?? null,
      total != null ? Number(total) : f.total,
      fecha ?? f.fecha,
      req.params.id,
    ])

    console.log('[facturas/update] Factura actualizada:', req.params.id)
    res.json(u.rows[0])
  } catch (error: any) {
    console.error('[facturas/update] Error:', error)
    res.status(500).json({ error: 'Error al actualizar factura' })
  }
})

// DELETE /facturas/:id - Eliminar factura (solo dueño)
r.delete('/facturas/:id', async (req: any, res: any) => {
  try {
    const userId = req.user.id
    const { rows } = await pool.query('SELECT * FROM facturas WHERE id = $1', [req.params.id])
    const f = rows[0]
    
    if (!f) {
      return res.status(404).json({ error: 'Factura no encontrada' })
    }
    
    if (f.usuario_id !== userId) {
      return res.status(403).json({ error: 'No autorizado' })
    }

    // Eliminar de Cloudinary si existe
    const url = f.imagen_path
    const publicIdMatch = url.match(/refugio_facturas\/([^/]+)/)

    if (publicIdMatch) {
      const publicId = `refugio_facturas/${publicIdMatch[1]}`
      try {
        await cloudinary.uploader.destroy(publicId)
        console.log('[facturas/delete] Imagen eliminada de Cloudinary:', publicId)
      } catch (cloudError) {
        console.error('[facturas/delete] Error eliminando de Cloudinary:', cloudError)
      }
    }

    // Eliminar de BD
    await pool.query('DELETE FROM facturas WHERE id = $1', [req.params.id])

    console.log('[facturas/delete] Factura eliminada:', req.params.id)
    res.json({ ok: true })
  } catch (error: any) {
    console.error('[facturas/delete] Error:', error)
    res.status(500).json({ error: 'Error al eliminar factura' })
  }
})

export default r