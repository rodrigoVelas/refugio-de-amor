import { Router } from 'express'
import { authMiddleware } from '../core/auth_middleware'
import { pool } from '../core/db'
import bcrypt from 'bcryptjs'

const r = Router()

// GET / - Listar usuarios
r.get('/', authMiddleware, async (req: any, res: any) => {
  try {
    const { rows } = await pool.query(`
      SELECT id, email, nombres, apellidos, rol, creado_en
      FROM usuarios
      ORDER BY creado_en DESC
    `)
    res.json(rows)
  } catch (error: any) {
    console.error('❌ Error en GET /usuarios:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST / - Crear usuario
r.post('/', authMiddleware, async (req: any, res: any) => {
  try {
    const { email, password, nombres, apellidos, rol } = req.body

    if (!email || !password || !nombres) {
      return res.status(400).json({ error: 'Email, password y nombres son requeridos' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    const { rows } = await pool.query(`
      INSERT INTO usuarios (email, password_hash, nombres, apellidos, rol, creado_en)
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING id, email, nombres, apellidos, rol, creado_en
    `, [email, hashedPassword, nombres, apellidos || null, rol || null])

    res.json({ ok: true, usuario: rows[0] })
  } catch (error: any) {
    console.error('❌ Error en POST /usuarios:', error)
    res.status(500).json({ error: error.message })
  }
})

// PUT /:id - Actualizar usuario
r.put('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params
    const { email, nombres, apellidos, rol, password } = req.body

    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (email !== undefined) {
      updates.push(`email = $${paramIndex}`)
      values.push(email)
      paramIndex++
    }

    if (nombres !== undefined) {
      updates.push(`nombres = $${paramIndex}`)
      values.push(nombres)
      paramIndex++
    }

    if (apellidos !== undefined) {
      updates.push(`apellidos = $${paramIndex}`)
      values.push(apellidos)
      paramIndex++
    }

    if (rol !== undefined) {
      updates.push(`rol = $${paramIndex}`)
      values.push(rol)
      paramIndex++
    }

    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10)
      updates.push(`password_hash = $${paramIndex}`)
      values.push(hashedPassword)
      paramIndex++
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' })
    }

    values.push(id)
    const query = `
      UPDATE usuarios 
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, email, nombres, apellidos, rol
    `

    const { rows } = await pool.query(query, values)

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    res.json({ ok: true, usuario: rows[0] })
  } catch (error: any) {
    console.error('❌ Error en PUT /usuarios/:id:', error)
    res.status(500).json({ error: error.message })
  }
})

// DELETE /:id - Eliminar usuario
r.delete('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params

    if (id === req.user?.id) {
      return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' })
    }

    const { rows } = await pool.query('DELETE FROM usuarios WHERE id = $1 RETURNING id', [id])

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }

    res.json({ ok: true })
  } catch (error: any) {
    console.error('❌ Error en DELETE /usuarios/:id:', error)
    res.status(500).json({ error: error.message })
  }
})

export default r