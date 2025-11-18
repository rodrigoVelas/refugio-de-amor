import { Router } from 'express'
import { authMiddleware } from '../core/auth_middleware'
import { pool } from '../core/db'

const r = Router()

// GET / - Listar subniveles
r.get('/', authMiddleware, async (req: any, res: any) => {
  try {
    const { rows } = await pool.query(`
      SELECT s.*, n.nombre as nivel_nombre
      FROM subniveles s
      LEFT JOIN niveles n ON s.nivel_id = n.id
      ORDER BY n.nombre, s.nombre
    `)
    res.json(rows)
  } catch (error: any) {
    console.error('❌ Error en GET /subniveles:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST / - Crear subnivel
r.post('/', authMiddleware, async (req: any, res: any) => {
  try {
    const { nombre, nivel_id } = req.body

    if (!nombre || !nombre.trim() || !nivel_id) {
      return res.status(400).json({ error: 'Nombre y nivel son requeridos' })
    }

    const { rows } = await pool.query(
      'INSERT INTO subniveles (nombre, nivel_id) VALUES ($1, $2) RETURNING *',
      [nombre.trim(), nivel_id]
    )

    res.json({ ok: true, subnivel: rows[0] })
  } catch (error: any) {
    console.error('❌ Error en POST /subniveles:', error)
    res.status(500).json({ error: error.message })
  }
})

// PUT /:id - Actualizar subnivel
r.put('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params
    const { nombre, nivel_id } = req.body

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre es requerido' })
    }

    const { rows } = await pool.query(
      'UPDATE subniveles SET nombre = $1, nivel_id = $2 WHERE id = $3 RETURNING *',
      [nombre.trim(), nivel_id, id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Subnivel no encontrado' })
    }

    res.json({ ok: true, subnivel: rows[0] })
  } catch (error: any) {
    console.error('❌ Error en PUT /subniveles/:id:', error)
    res.status(500).json({ error: error.message })
  }
})

// DELETE /:id - Eliminar subnivel
r.delete('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params

    const { rows } = await pool.query('DELETE FROM subniveles WHERE id = $1 RETURNING id', [id])

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Subnivel no encontrado' })
    }

    res.json({ ok: true })
  } catch (error: any) {
    console.error('❌ Error en DELETE /subniveles/:id:', error)
    res.status(500).json({ error: error.message })
  }
})

export default r