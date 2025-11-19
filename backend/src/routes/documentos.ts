import { Router } from 'express'
import { authMiddleware } from '../core/auth_middleware'
import { pool } from '../core/db'

const r = Router()

// GET / - Listar documentos
r.get('/', authMiddleware, async (req: any, res: any) => {
  try {
    console.log('\n📄 GET /documentos')
    console.log('Usuario:', req.user?.email)

    const { rows } = await pool.query(`
      SELECT d.*, u.nombres as subido_por_nombre, u.apellidos as subido_por_apellidos
      FROM documentos_mensuales d
      LEFT JOIN usuarios u ON d.subido_por = u.id
      WHERE d.activo = true
      ORDER BY d.anio DESC, d.mes DESC, d.fecha_subida DESC
    `)

    console.log('✅ Encontrados:', rows.length)
    res.json(rows)
  } catch (error: any) {
    console.error('❌ Error en GET /documentos:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST / - Crear/subir documento
r.post('/', authMiddleware, async (req: any, res: any) => {
  try {
    const { 
      titulo, 
      descripcion, 
      mes, 
      anio, 
      archivo_url, 
      archivo_nombre,
      archivo_tipo,
      archivo_size
    } = req.body
    const userId = req.user?.id

    if (!titulo || !mes || !anio) {
      return res.status(400).json({ error: 'Título, mes y año son requeridos' })
    }

    const { rows } = await pool.query(`
      INSERT INTO documentos_mensuales (
        titulo, descripcion, mes, anio, archivo_url, archivo_nombre, 
        archivo_tipo, archivo_size, subido_por, fecha_subida, activo
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW(), true)
      RETURNING *
    `, [
      titulo, 
      descripcion || null, 
      mes, 
      anio, 
      archivo_url || null,
      archivo_nombre || null,
      archivo_tipo || 'pdf',
      archivo_size || null,
      userId
    ])

    res.json({ ok: true, documento: rows[0] })
  } catch (error: any) {
    console.error('❌ Error en POST /documentos:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /:id - Obtener documento específico
r.get('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params

    const { rows } = await pool.query(`
      SELECT d.*, u.nombres as subido_por_nombre, u.apellidos as subido_por_apellidos
      FROM documentos_mensuales d
      LEFT JOIN usuarios u ON d.subido_por = u.id
      WHERE d.id = $1
    `, [id])

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Documento no encontrado' })
    }

    res.json(rows[0])
  } catch (error: any) {
    console.error('❌ Error en GET /documentos/:id:', error)
    res.status(500).json({ error: error.message })
  }
})

// PUT /:id - Actualizar documento
r.put('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params
    const { titulo, descripcion, mes, anio, activo } = req.body

    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (titulo !== undefined) {
      updates.push(`titulo = $${paramIndex}`)
      values.push(titulo)
      paramIndex++
    }

    if (descripcion !== undefined) {
      updates.push(`descripcion = $${paramIndex}`)
      values.push(descripcion)
      paramIndex++
    }

    if (mes !== undefined) {
      updates.push(`mes = $${paramIndex}`)
      values.push(mes)
      paramIndex++
    }

    if (anio !== undefined) {
      updates.push(`anio = $${paramIndex}`)
      values.push(anio)
      paramIndex++
    }

    if (activo !== undefined) {
      updates.push(`activo = $${paramIndex}`)
      values.push(activo)
      paramIndex++
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' })
    }

    values.push(id)

    const { rows } = await pool.query(
      `UPDATE documentos_mensuales SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    )

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Documento no encontrado' })
    }

    res.json({ ok: true, documento: rows[0] })
  } catch (error: any) {
    console.error('❌ Error en PUT /documentos/:id:', error)
    res.status(500).json({ error: error.message })
  }
})

// DELETE /:id - Eliminar documento (soft delete)
r.delete('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params

    // Soft delete: marcar como inactivo
    const { rows } = await pool.query(
      'UPDATE documentos_mensuales SET activo = false WHERE id = $1 RETURNING id',
      [id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Documento no encontrado' })
    }

    res.json({ ok: true })
  } catch (error: any) {
    console.error('❌ Error en DELETE /documentos/:id:', error)
    res.status(500).json({ error: error.message })
  }
})

export default r