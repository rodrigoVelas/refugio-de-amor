import { Router } from 'express'
import { authMiddleware } from '../core/auth_middleware'
import { pool } from '../core/db'

const r = Router()

// GET / - Listar actividades
r.get('/', authMiddleware, async (req: any, res: any) => {
  try {
    const { from, to } = req.query
    
    let query = 'SELECT * FROM actividades'
    const params: any[] = []
    
    if (from && to) {
      query += ' WHERE fecha >= $1 AND fecha <= $2'
      params.push(from, to)
    }
    
    query += ' ORDER BY fecha DESC, hora DESC'
    
    const { rows } = await pool.query(query, params)
    res.json(rows)
  } catch (error: any) {
    console.error('❌ Error en GET /actividades:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST / - Crear actividad
r.post('/', authMiddleware, async (req: any, res: any) => {
  try {
    const { titulo, descripcion, fecha, hora } = req.body

    if (!titulo || !fecha) {
      return res.status(400).json({ error: 'Título y fecha son requeridos' })
    }

    const { rows } = await pool.query(
      'INSERT INTO actividades (titulo, descripcion, fecha, hora) VALUES ($1, $2, $3, $4) RETURNING *',
      [titulo, descripcion || null, fecha, hora || null]
    )

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
    const { titulo, descripcion, fecha, hora } = req.body

    if (!titulo || !fecha) {
      return res.status(400).json({ error: 'Título y fecha son requeridos' })
    }

    const { rows } = await pool.query(
      'UPDATE actividades SET titulo = $1, descripcion = $2, fecha = $3, hora = $4 WHERE id = $5 RETURNING *',
      [titulo, descripcion || null, fecha, hora || null, id]
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