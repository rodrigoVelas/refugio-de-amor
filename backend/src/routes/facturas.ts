import { Router } from 'express'
import { authMiddleware } from '../core/auth_middleware'
import { pool } from '../core/db'
import multer from 'multer'
import { v2 as cloudinary } from 'cloudinary'

const r = Router()

// Configurar Cloudinary - IMPORTANTE: api_key como STRING
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY || '828888284183922',
  api_secret: process.env.CLOUDINARY_API_SECRET
})

const upload = multer({ storage: multer.memoryStorage() })

// GET / - Listar facturas
r.get('/', authMiddleware, async (req: any, res: any) => {
  try {
    const { rows } = await pool.query(`
      SELECT f.*, u.nombres as usuario_nombre, u.apellidos as usuario_apellidos, u.email
      FROM facturas f
      LEFT JOIN usuarios u ON f.usuario_id = u.id
      ORDER BY f.fecha DESC, f.creado_en DESC
    `)
    res.json(rows)
  } catch (error: any) {
    console.error('❌ Error en GET /facturas:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /upload - Subir factura CON CLOUDINARY
r.post('/upload', authMiddleware, upload.single('imagen'), async (req: any, res: any) => {
  try {
    const userId = req.user?.id
    const descripcion = req.body.descripcion
    const total = req.body.total
    const fecha = req.body.fecha
    const imagen = req.file

    console.log('📝 POST /facturas/upload')
    console.log('Datos:', { descripcion, total, fecha, tieneImagen: !!imagen })

    if (!total || !fecha) {
      return res.status(400).json({ error: 'Total y fecha son requeridos' })
    }

    let imagen_path = null
    let imagen_mime = null

    // Subir a Cloudinary si hay imagen
    if (imagen) {
      console.log('📤 Subiendo imagen a Cloudinary...')
      
      try {
        const uploadPromise = new Promise((resolve, reject) => {
          const uploadStream = cloudinary.uploader.upload_stream(
            { 
              folder: 'facturas',
              resource_type: 'auto',
              transformation: [
                { quality: 'auto' },
                { fetch_format: 'auto' }
              ]
            },
            (error, result) => {
              if (error) reject(error)
              else resolve(result)
            }
          )
          uploadStream.end(imagen.buffer)
        })

        const result: any = await uploadPromise
        imagen_path = result.secure_url
        imagen_mime = imagen.mimetype
        
        console.log('✅ Imagen subida a Cloudinary:', imagen_path)
      } catch (cloudinaryError: any) {
        console.error('❌ Error subiendo a Cloudinary:', cloudinaryError)
        // Continuar sin imagen si falla Cloudinary
      }
    }

    const { rows } = await pool.query(`
      INSERT INTO facturas (
        usuario_id, descripcion, imagen_path, imagen_mime, total, fecha, 
        creado_en, modificado_en
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `, [
      userId, 
      descripcion || 'Sin descripción', 
      imagen_path, 
      imagen_mime, 
      parseFloat(total), 
      fecha
    ])

    console.log('✅ Factura creada:', rows[0].id)
    res.json({ ok: true, id: rows[0].id, factura: rows[0] })
  } catch (error: any) {
    console.error('❌ Error en POST /facturas/upload:', error.message)
    res.status(500).json({ error: error.message })
  }
})

// GET /:id/imagen - Obtener imagen
r.get('/:id/imagen', async (req: any, res: any) => {
  try {
    const { id } = req.params
    const { rows } = await pool.query(
      'SELECT imagen_path FROM facturas WHERE id = $1',
      [id]
    )
    
    if (rows.length === 0 || !rows[0].imagen_path) {
      return res.status(404).json({ error: 'Imagen no encontrada' })
    }
    
    res.redirect(rows[0].imagen_path)
  } catch (error: any) {
    console.error('❌ Error:', error)
    res.status(500).json({ error: error.message })
  }
})

// PUT /:id - Actualizar factura
r.put('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params
    const { descripcion, total, fecha } = req.body
    
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (descripcion !== undefined) {
      updates.push(`descripcion = $${paramIndex}`)
      values.push(descripcion)
      paramIndex++
    }
    
    if (total !== undefined) {
      updates.push(`total = $${paramIndex}`)
      values.push(total)
      paramIndex++
    }
    
    if (fecha !== undefined) {
      updates.push(`fecha = $${paramIndex}`)
      values.push(fecha)
      paramIndex++
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' })
    }

    updates.push(`modificado_en = NOW()`)
    values.push(id)

    const { rows } = await pool.query(
      `UPDATE facturas SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    )

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Factura no encontrada' })
    }

    res.json({ ok: true, factura: rows[0] })
  } catch (error: any) {
    console.error('❌ Error:', error)
    res.status(500).json({ error: error.message })
  }
})

// DELETE /:id - Eliminar factura
r.delete('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params
    
    const { rows } = await pool.query(
      'DELETE FROM facturas WHERE id = $1 RETURNING id',
      [id]
    )
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Factura no encontrada' })
    }
    
    res.json({ ok: true })
  } catch (error: any) {
    console.error('❌ Error:', error)
    res.status(500).json({ error: error.message })
  }
})

export default r