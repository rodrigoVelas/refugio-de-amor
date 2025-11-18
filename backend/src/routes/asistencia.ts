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
      SELECT a.*, u.nombres as creado_por_nombre, u.apellidos as creado_por_apellidos
      FROM asistencia a
      LEFT JOIN usuarios u ON a.creado_por = u.id
      ORDER BY a.fecha DESC, a.hora DESC
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
    const { fecha, hora, notas } = req.body
    const userId = req.user?.id

    if (!fecha) {
      return res.status(400).json({ error: 'La fecha es requerida' })
    }

    const { rows } = await pool.query(`
      INSERT INTO asistencia (fecha, hora, notas, creado_por, creado_en)
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `, [fecha, hora || null, notas || null, userId])

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

    // Obtener registro de asistencia
    const asistenciaQuery = await pool.query(
      'SELECT * FROM asistencia WHERE id = $1',
      [id]
    )

    if (asistenciaQuery.rows.length === 0) {
      return res.status(404).json({ error: 'Registro de asistencia no encontrado' })
    }

    // Obtener detalles de asistencia
    const detallesQuery = await pool.query(`
      SELECT ad.*, n.nombres as nino_nombres, n.apellidos as nino_apellidos, n.codigo as nino_codigo
      FROM asistencia_detalles ad
      LEFT JOIN ninos n ON ad.nino_id = n.id
      WHERE ad.asistencia_id = $1
      ORDER BY n.apellidos, n.nombres
    `, [id])

    res.json({
      asistencia: asistenciaQuery.rows[0],
      detalles: detallesQuery.rows
    })
  } catch (error: any) {
    console.error('❌ Error en GET /asistencia/:id/editar:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /:id/detalles - Guardar detalles de asistencia
r.post('/:id/detalles', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params
    const { items, fecha, hora } = req.body

    if (!items || !Array.isArray(items)) {
      return res.status(400).json({ error: 'Items inválidos' })
    }

    // Actualizar fecha/hora si se proporcionan
    if (fecha || hora) {
      await pool.query(
        'UPDATE asistencia SET fecha = COALESCE($1, fecha), hora = COALESCE($2, hora) WHERE id = $3',
        [fecha, hora, id]
      )
    }

    // Eliminar detalles existentes
    await pool.query('DELETE FROM asistencia_detalles WHERE asistencia_id = $1', [id])

    // Insertar nuevos detalles
    for (const item of items) {
      await pool.query(`
        INSERT INTO asistencia_detalles (asistencia_id, nino_id, presente, observaciones)
        VALUES ($1, $2, $3, $4)
      `, [id, item.nino_id, item.presente || false, item.observaciones || null])
    }

    res.json({ ok: true })
  } catch (error: any) {
    console.error('❌ Error en POST /asistencia/:id/detalles:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /:id/export.csv - Exportar a CSV
r.get('/:id/export.csv', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params

    const { rows } = await pool.query(`
      SELECT 
        n.codigo,
        n.nombres,
        n.apellidos,
        CASE WHEN ad.presente THEN 'Presente' ELSE 'Ausente' END as estado,
        ad.observaciones
      FROM asistencia_detalles ad
      LEFT JOIN ninos n ON ad.nino_id = n.id
      WHERE ad.asistencia_id = $1
      ORDER BY n.apellidos, n.nombres
    `, [id])

    // Crear CSV
    let csv = 'Código,Nombres,Apellidos,Estado,Observaciones\n'
    rows.forEach(row => {
      csv += `"${row.codigo}","${row.nombres}","${row.apellidos}","${row.estado}","${row.observaciones || ''}"\n`
    })

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="asistencia_${id}.csv"`)
    res.send(csv)
  } catch (error: any) {
    console.error('❌ Error en GET /asistencia/:id/export.csv:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /:id/export - Alias para export.csv
r.get('/:id/export', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params

    const { rows } = await pool.query(`
      SELECT 
        n.codigo,
        n.nombres,
        n.apellidos,
        CASE WHEN ad.presente THEN 'Presente' ELSE 'Ausente' END as estado,
        ad.observaciones
      FROM asistencia_detalles ad
      LEFT JOIN ninos n ON ad.nino_id = n.id
      WHERE ad.asistencia_id = $1
      ORDER BY n.apellidos, n.nombres
    `, [id])

    // Crear CSV
    let csv = 'Código,Nombres,Apellidos,Estado,Observaciones\n'
    rows.forEach(row => {
      csv += `"${row.codigo}","${row.nombres}","${row.apellidos}","${row.estado}","${row.observaciones || ''}"\n`
    })

    res.setHeader('Content-Type', 'text/csv; charset=utf-8')
    res.setHeader('Content-Disposition', `attachment; filename="asistencia_${id}.csv"`)
    res.send(csv)
  } catch (error: any) {
    console.error('❌ Error en GET /asistencia/:id/export:', error)
    res.status(500).json({ error: error.message })
  }
})

// DELETE /:id - Eliminar registro de asistencia
r.delete('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params

    // Eliminar detalles primero
    await pool.query('DELETE FROM asistencia_detalles WHERE asistencia_id = $1', [id])

    // Eliminar registro principal
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