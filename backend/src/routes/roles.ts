import { Router } from 'express'
import { authMiddleware } from '../core/auth_middleware'
import { pool } from '../core/db'

const r = Router()

// GET / - Listar roles
r.get('/', authMiddleware, async (req: any, res: any) => {
  try {
    const { rows } = await pool.query('SELECT * FROM roles ORDER BY nombre')
    res.json(rows)
  } catch (error: any) {
    console.error('❌ Error en GET /roles:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST / - Crear rol
r.post('/', authMiddleware, async (req: any, res: any) => {
  try {
    const { nombre } = req.body

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre es requerido' })
    }

    const { rows } = await pool.query(
      'INSERT INTO roles (nombre) VALUES ($1) RETURNING *',
      [nombre.trim()]
    )

    res.json({ ok: true, rol: rows[0] })
  } catch (error: any) {
    console.error('❌ Error en POST /roles:', error)
    res.status(500).json({ error: error.message })
  }
})

// PUT /:id - Actualizar rol
r.put('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params
    const { nombre } = req.body

    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre es requerido' })
    }

    const { rows } = await pool.query(
      'UPDATE roles SET nombre = $1 WHERE id = $2 RETURNING *',
      [nombre.trim(), id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Rol no encontrado' })
    }

    res.json({ ok: true, rol: rows[0] })
  } catch (error: any) {
    console.error('❌ Error en PUT /roles/:id:', error)
    res.status(500).json({ error: error.message })
  }
})

// DELETE /:id - Eliminar rol
r.delete('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params

    const check = await pool.query('SELECT COUNT(*) as count FROM usuarios WHERE rol = $1', [id])
    
    if (parseInt(check.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: 'No se puede eliminar el rol porque hay usuarios asignados' 
      })
    }

    const { rows } = await pool.query('DELETE FROM roles WHERE id = $1 RETURNING id', [id])

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Rol no encontrado' })
    }

    res.json({ ok: true })
  } catch (error: any) {
    console.error('❌ Error en DELETE /roles/:id:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /permisos - Listar permisos disponibles
r.get('/permisos', authMiddleware, async (req: any, res: any) => {
  try {
    const permisos = [
      'usuarios_ver',
      'usuarios_crear',
      'usuarios_editar',
      'usuarios_eliminar',
      'ninos_ver',
      'ninos_crear',
      'ninos_editar',
      'ninos_eliminar',
      'ver_reportes',
      'exportar_reportes'
    ]
    res.json(permisos)
  } catch (error: any) {
    console.error('❌ Error en GET /roles/permisos:', error)
    res.status(500).json({ error: error.message })
  }
})

export default r