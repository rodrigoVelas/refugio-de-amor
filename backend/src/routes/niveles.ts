import { Router } from 'express'
import { authMiddleware } from '../core/auth_middleware'
import { pool } from '../core/db'

const r = Router()

// GET / - Listar niveles
r.get('/', authMiddleware, async (req: any, res: any) => {
  try {
    const { rows } = await pool.query('SELECT id, nombre, descripcion FROM niveles ORDER BY nombre')
    res.json(rows)
  } catch (error: any) {
    console.error('❌ Error en GET /niveles:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST / - Crear nivel
r.post('/', authMiddleware, async (req: any, res: any) => {
  try {
    const { nombre, descripcion } = req.body

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre es requerido' })
    }

    const { rows } = await pool.query(
      'INSERT INTO niveles (nombre, descripcion) VALUES ($1, $2) RETURNING *',
      [nombre.trim(), descripcion || null]
    )

    res.json({ ok: true, nivel: rows[0] })
  } catch (error: any) {
    console.error('❌ Error en POST /niveles:', error)
    res.status(500).json({ error: error.message })
  }
})

// PUT /:id - Actualizar nivel
r.put('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params
    const { nombre, descripcion } = req.body

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre es requerido' })
    }

    const { rows } = await pool.query(
      'UPDATE niveles SET nombre = $1, descripcion = $2, modificado_en = NOW() WHERE id = $3 RETURNING *',
      [nombre.trim(), descripcion || null, id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Nivel no encontrado' })
    }

    res.json({ ok: true, nivel: rows[0] })
  } catch (error: any) {
    console.error('❌ Error en PUT /niveles/:id:', error)
    res.status(500).json({ error: error.message })
  }
})

// DELETE /:id - Eliminar nivel
r.delete('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params

    // Verificar si tiene niños asociados
    const check = await pool.query('SELECT COUNT(*) as count FROM ninos WHERE nivel_id = $1', [id])
    
    if (parseInt(check.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar el nivel porque tiene niños asociados' 
      })
    }

    const { rows } = await pool.query('DELETE FROM niveles WHERE id = $1 RETURNING id', [id])

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Nivel no encontrado' })
    }

    res.json({ ok: true })
  } catch (error: any) {
    console.error('❌ Error en DELETE /niveles/:id:', error)
    res.status(500).json({ error: error.message })
  }
})

export default r