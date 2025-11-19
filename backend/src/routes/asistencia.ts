import { Router } from 'express'
import { authMiddleware } from '../core/auth_middleware'
import { pool } from '../core/db'

const r = Router()

// GET /ping - Health check
r.get('/ping', (req: any, res: any) => {
  res.json({ ok: true, message: 'asistencia ok' })
})

// GET / - Listar registros de asistencia
r.get('/', authMiddleware, async (req: any, res: any) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        a.id,
        a.fecha,
        a.hora,
        a.nota,
        a.estado,
        u.nombres as usuario_nombre,
        u.apellidos as usuario_apellidos
      FROM asistencia a
      LEFT JOIN usuarios u ON a.usuario_id = u.id
      ORDER BY a.fecha DESC, a.creado_en DESC
    `)
    res.json(rows)
  } catch (error: any) {
    console.error('❌ Error en GET /asistencia:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST / - Crear registro de asistencia
r.post('/', authMiddleware, async (req: any, res: any) => {
  try {
    const { fecha, hora, nota, estado, nino_id, subnivel_id, maestro_id } = req.body
    const userId = req.user?.id

    if (!fecha) {
      return res.status(400).json({ error: 'La fecha es requerida' })
    }

    const { rows } = await pool.query(`
      INSERT INTO asistencia (fecha, hora, nota, estado, nino_id, subnivel_id, maestro_id, usuario_id, creado_en, modificado_en)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
      RETURNING *
    `, [
      fecha, 
      hora || null, 
      nota || null, 
      estado || 'pendiente',
      nino_id || null,
      subnivel_id || null,
      maestro_id || null,
      userId
    ])

    res.json({ ok: true, asistencia: rows[0] })
  } catch (error: any) {
    console.error('❌ Error en POST /asistencia:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /:id/editar - Obtener datos para editar
r.get('/:id/editar', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params

    const { rows } = await pool.query(
      'SELECT * FROM asistencia WHERE id = $1',
      [id]
    )

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Registro de asistencia no encontrado' })
    }

    res.json({ asistencia: rows[0] })
  } catch (error: any) {
    console.error('❌ Error en GET /asistencia/:id/editar:', error)
    res.status(500).json({ error: error.message })
  }
})

// PUT /:id - Actualizar asistencia
r.put('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params
    const { fecha, hora, nota, estado, nino_id } = req.body

    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

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

    if (nota !== undefined) {
      updates.push(`nota = $${paramIndex}`)
      values.push(nota)
      paramIndex++
    }

    if (estado !== undefined) {
      updates.push(`estado = $${paramIndex}`)
      values.push(estado)
      paramIndex++
    }

    if (nino_id !== undefined) {
      updates.push(`nino_id = $${paramIndex}`)
      values.push(nino_id)
      paramIndex++
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' })
    }

    updates.push(`modificado_en = NOW()`)
    values.push(id)

    const { rows } = await pool.query(
      `UPDATE asistencia SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`,
      values
    )

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Registro no encontrado' })
    }

    res.json({ ok: true, asistencia: rows[0] })
  } catch (error: any) {
    console.error('❌ Error en PUT /asistencia/:id:', error)
    res.status(500).json({ error: error.message })
  }
})

// DELETE /:id - Eliminar registro de asistencia
r.delete('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params

    const { rows } = await pool.query('DELETE FROM asistencia WHERE id = $1 RETURNING id', [id])

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Registro de asistencia no encontrado' })
    }

    res.json({ ok: true })
  } catch (error: any) {
    console.error('❌ Error en DELETE /asistencia/:id:', error)
    res.status(500).json({ error: error.message })
  }
})

export default r