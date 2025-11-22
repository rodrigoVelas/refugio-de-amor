import { Router } from 'express'
import { authMiddleware } from '../core/auth_middleware'
import { pool } from '../core/db'
import multer from 'multer'

const r = Router()

// Configurar multer para manejar archivos en memoria
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

// POST /upload - Subir factura (CON MULTER para FormData)
r.post('/upload', authMiddleware, upload.single('imagen'), async (req: any, res: any) => {
  try {
    const userId = req.user?.id

    console.log('📝 POST /facturas/upload')
    console.log('Usuario:', req.user?.email)
    console.log('Body:', req.body)
    console.log('File:', req.file ? 'Sí hay archivo' : 'No hay archivo')

    // Extraer datos del FormData
    const descripcion = req.body.descripcion
    const total = req.body.total
    const fecha = req.body.fecha
    const imagen = req.file

    console.log('Datos extraídos:', { descripcion, total, fecha, tieneImagen: !!imagen })

    // Validación
    if (!total || !fecha) {
      console.log('❌ Faltan campos obligatorios')
      return res.status(400).json({ 
        error: 'Total y fecha son requeridos',
        recibido: { descripcion, total, fecha }
      })
    }

    // Si hay imagen, subirla a Cloudinary (o guardar la URL)
    let imagen_path = null
    let imagen_mime = null

    if (imagen) {
      // AQUÍ deberías subir a Cloudinary
      // Por ahora, guardamos datos básicos
      imagen_mime = imagen.mimetype
      // imagen_path = URL_DE_CLOUDINARY después de subir
      console.log('⚠️ Imagen recibida pero no se sube a Cloudinary aún')
    }

    const { rows } = await pool.query(`
      INSERT INTO facturas (
        usuario_id, 
        descripcion, 
        imagen_path, 
        imagen_mime, 
        total, 
        fecha, 
        creado_en, 
        modificado_en
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

// GET /:id/imagen - Obtener imagen de factura
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
    console.error('❌ Error en GET /facturas/:id/imagen:', error)
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
    console.error('❌ Error en PUT /facturas/:id:', error)
    res.status(500).json({ error: error.message })
  }
})

// DELETE /:id - Eliminar factura
r.delete('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params
    
    const { rows } = await pool.query('DELETE FROM facturas WHERE id = $1 RETURNING id', [id])
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Factura no encontrada' })
    }
    
    res.json({ ok: true })
  } catch (error: any) {
    console.error('❌ Error en DELETE /facturas/:id:', error)
    res.status(500).json({ error: error.message })
  }
})

export default r