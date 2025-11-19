import { Router } from 'express'
import { authMiddleware } from '../core/auth_middleware'
import { pool } from '../core/db'

const r = Router()

// GET / - Listar facturas
r.get('/', authMiddleware, async (req: any, res: any) => {
  try {
    const { rows } = await pool.query(`
      SELECT f.*, u.nombres as usuario_nombre, u.apellidos as usuario_apellidos
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

// POST /upload - Subir factura
r.post('/upload', authMiddleware, async (req: any, res: any) => {
  try {
    const userId = req.user?.id
    const { descripcion, total, fecha, imagen_path, imagen_mime } = req.body

    if (!total || !fecha) {
      return res.status(400).json({ error: 'Total y fecha son requeridos' })
    }

    const { rows } = await pool.query(`
      INSERT INTO facturas (usuario_id, descripcion, total, fecha, imagen_path, imagen_mime, creado_en, modificado_en)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `, [
      userId,
      descripcion || null,
      total,
      fecha,
      imagen_path || null,
      imagen_mime || null
    ])

    res.json({ ok: true, factura: rows[0] })
  } catch (error: any) {
    console.error('❌ Error en POST /facturas/upload:', error)
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

    // Redirigir a la URL de Cloudinary
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