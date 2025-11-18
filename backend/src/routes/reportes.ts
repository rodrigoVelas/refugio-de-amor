import { Router } from 'express'
import { authMiddleware } from '../core/auth_middleware'
import { pool } from '../core/db'

const r = Router()

// GET /ping - Health check
r.get('/ping', (req: any, res: any) => {
  res.json({ ok: true, message: 'reportes ok' })
})

// GET /financiero - Reporte financiero
r.get('/financiero', authMiddleware, async (req: any, res: any) => {
  try {
    const { desde, hasta } = req.query

    let query = `
      SELECT 
        f.id,
        f.numero_factura,
        f.monto,
        f.fecha,
        f.descripcion,
        u.nombres || ' ' || COALESCE(u.apellidos, '') as usuario
      FROM facturas f
      LEFT JOIN usuarios u ON f.usuario_id = u.id
      WHERE 1=1
    `
    const params: any[] = []
    let paramIndex = 1

    if (desde) {
      query += ` AND f.fecha >= $${paramIndex}`
      params.push(desde)
      paramIndex++
    }

    if (hasta) {
      query += ` AND f.fecha <= $${paramIndex}`
      params.push(hasta)
      paramIndex++
    }

    query += ' ORDER BY f.fecha DESC'

    const { rows } = await pool.query(query, params)

    // Calcular total
    const total = rows.reduce((sum, row) => sum + parseFloat(row.monto || 0), 0)

    res.json({
      facturas: rows,
      total: total.toFixed(2),
      count: rows.length
    })
  } catch (error: any) {
    console.error('❌ Error en GET /reportes/financiero:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /asistencia/datos - Datos de asistencia
r.get('/asistencia/datos', authMiddleware, async (req: any, res: any) => {
  try {
    const { desde, hasta } = req.query

    let query = `
      SELECT 
        a.id,
        a.fecha,
        a.hora,
        COUNT(ad.id) as total_ninos,
        SUM(CASE WHEN ad.presente THEN 1 ELSE 0 END) as presentes,
        SUM(CASE WHEN NOT ad.presente THEN 1 ELSE 0 END) as ausentes
      FROM asistencia a
      LEFT JOIN asistencia_detalles ad ON a.id = ad.asistencia_id
      WHERE 1=1
    `
    const params: any[] = []
    let paramIndex = 1

    if (desde) {
      query += ` AND a.fecha >= $${paramIndex}`
      params.push(desde)
      paramIndex++
    }

    if (hasta) {
      query += ` AND a.fecha <= $${paramIndex}`
      params.push(hasta)
      paramIndex++
    }

    query += ' GROUP BY a.id, a.fecha, a.hora ORDER BY a.fecha DESC, a.hora DESC'

    const { rows } = await pool.query(query, params)

    res.json(rows)
  } catch (error: any) {
    console.error('❌ Error en GET /reportes/asistencia/datos:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /ninos-inactivos/datos - Datos de niños inactivos
r.get('/ninos-inactivos/datos', authMiddleware, async (req: any, res: any) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        n.id,
        n.codigo,
        n.nombres,
        n.apellidos,
        n.fecha_nacimiento,
        n.motivo_inactividad,
        n.fecha_inactivacion,
        nv.nombre as nivel_nombre,
        sn.nombre as subnivel_nombre
      FROM ninos n
      LEFT JOIN niveles nv ON n.nivel_id = nv.id
      LEFT JOIN subniveles sn ON n.subnivel_id = sn.id
      WHERE n.activo = false
      ORDER BY n.fecha_inactivacion DESC, n.apellidos, n.nombres
    `)

    res.json(rows)
  } catch (error: any) {
    console.error('❌ Error en GET /reportes/ninos-inactivos/datos:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /ninos - Reporte general de niños
r.get('/ninos', authMiddleware, async (req: any, res: any) => {
  try {
    const { rows } = await pool.query(`
      SELECT 
        n.id,
        n.codigo,
        n.nombres,
        n.apellidos,
        n.fecha_nacimiento,
        n.genero,
        n.activo,
        nv.nombre as nivel_nombre,
        sn.nombre as subnivel_nombre,
        u.nombres || ' ' || COALESCE(u.apellidos, '') as colaborador
      FROM ninos n
      LEFT JOIN niveles nv ON n.nivel_id = nv.id
      LEFT JOIN subniveles sn ON n.subnivel_id = sn.id
      LEFT JOIN usuarios u ON n.maestro_id = u.id
      WHERE n.activo = true
      ORDER BY n.apellidos, n.nombres
    `)

    res.json(rows)
  } catch (error: any) {
    console.error('❌ Error en GET /reportes/ninos:', error)
    res.status(500).json({ error: error.message })
  }
})

export default r