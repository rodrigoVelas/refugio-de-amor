import { Router } from 'express'
import { authMiddleware } from '../core/auth_middleware'
import { pool } from '../core/db'

const r = Router()

// GET / - Listar actividades
r.get('/', authMiddleware, async (req: any, res: any) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        id,
        titulo,
        descripcion,
        fecha,
        hora,
        estado
      FROM actividades
      ORDER BY fecha DESC, hora DESC
    `)
    res.json(rows)
  } catch (error: any) {
    console.error('❌ Error en GET /actividades:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST / - Crear actividad
r.post('/', authMiddleware, async (req: any, res: any) => {
  try {
    const { titulo, descripcion, fecha, hora, estado } = req.body
    const userId = req.user?.id

    console.log('📝 POST /actividades - Crear actividad')
    console.log('Datos:', { titulo, descripcion, fecha, hora, estado })

    if (!titulo || !fecha) {
      return res.status(400).json({ error: 'Título y fecha son requeridos' })
    }

    const { rows } = await pool.query(`
      INSERT INTO actividades (
        titulo, 
        descripcion, 
        fecha, 
        hora, 
        estado, 
        creado_por, 
        creado_en, 
        modificado_en
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING *
    `, [
      titulo,
      descripcion || null,
      fecha,
      hora || null,
      estado || 'pendiente',
      userId
    ])

    console.log('✅ Actividad creada:', rows[0].id)
    res.json({ ok: true, actividad: rows[0] })
  } catch (error: any) {
    console.error('❌ Error en POST /actividades:', error)
    res.status(500).json({ error: error.message })
  }
})

// PUT /:id - Actualizar actividad
r.put('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params
    const { titulo, descripcion, fecha, hora, estado } = req.body

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

    if (fecha !== undefined) {
      updates.push(`fecha = $${paramIndex}`)
      values.push(fecha)
      paramIndex++
    }

    if (hora !== undefined) {
      updates.push(`hora = $${paramIndex}`)
      values.push(hora)
      paramIndex++
    }

    if (estado !== undefined) {
      updates.push(`estado = $${paramIndex}`)
      values.push(estado)
      paramIndex++
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' })
    }

    updates.push(`modificado_en = NOW()`)
    values.push(id)

    const { rows } = await pool.query(
      `UPDATE actividades SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    )

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Actividad no encontrada' })
    }

    res.json({ ok: true, actividad: rows[0] })
  } catch (error: any) {
    console.error('❌ Error en PUT /actividades/:id:', error)
    res.status(500).json({ error: error.message })
  }
})

// DELETE /:id - Eliminar actividad
r.delete('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params

    const { rows } = await pool.query('DELETE FROM actividades WHERE id = $1 RETURNING id', [id])

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Actividad no encontrada' })
    }

    res.json({ ok: true })
  } catch (error: any) {
    console.error('❌ Error en DELETE /actividades/:id:', error)
    res.status(500).json({ error: error.message })
  }
})

export default r