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
      ORDER BY d.anio DESC, d.mes DESC
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
    const { titulo, descripcion, mes, anio, url, tipo } = req.body
    const userId = req.user?.id

    if (!titulo || !mes || !anio) {
      return res.status(400).json({ error: 'Título, mes y año son requeridos' })
    }

    const { rows } = await pool.query(`
      INSERT INTO documentos_mensuales (titulo, descripcion, mes, anio, url, tipo, subido_por)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [titulo, descripcion || null, mes, anio, url || null, tipo || 'pdf', userId])

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

// DELETE /:id - Eliminar documento
r.delete('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params

    const { rows } = await pool.query('DELETE FROM documentos_mensuales WHERE id = $1 RETURNING id', [id])

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