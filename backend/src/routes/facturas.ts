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
      ORDER BY f.fecha DESC
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
    const { numero_factura, monto, fecha, descripcion, categoria, imagen_url } = req.body

    if (!monto || !fecha) {
      return res.status(400).json({ error: 'Monto y fecha son requeridos' })
    }

    const { rows } = await pool.query(`
      INSERT INTO facturas (numero_factura, monto, fecha, descripcion, categoria, usuario_id, imagen_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [
      numero_factura || null,
      monto,
      fecha,
      descripcion || null,
      categoria || 'egreso',
      userId,
      imagen_url || null
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
      'SELECT imagen_url FROM facturas WHERE id = $1',
      [id]
    )

    if (rows.length === 0 || !rows[0].imagen_url) {
      return res.status(404).json({ error: 'Imagen no encontrada' })
    }

    // Redirigir a la URL de Cloudinary
    res.redirect(rows[0].imagen_url)
  } catch (error: any) {
    console.error('❌ Error en GET /facturas/:id/imagen:', error)
    res.status(500).json({ error: error.message })
  }
})

// PUT /:id - Actualizar factura
r.put('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params
    const { numero_factura, monto, fecha, descripcion, categoria } = req.body

    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (numero_factura !== undefined) {
      updates.push(`numero_factura = $${paramIndex}`)
      values.push(numero_factura)
      paramIndex++
    }

    if (monto !== undefined) {
      updates.push(`monto = $${paramIndex}`)
      values.push(monto)
      paramIndex++
    }

    if (fecha !== undefined) {
      updates.push(`fecha = $${paramIndex}`)
      values.push(fecha)
      paramIndex++
    }

    if (descripcion !== undefined) {
      updates.push(`descripcion = $${paramIndex}`)
      values.push(descripcion)
      paramIndex++
    }

    if (categoria !== undefined) {
      updates.push(`categoria = $${paramIndex}`)
      values.push(categoria)
      paramIndex++
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' })
    }

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