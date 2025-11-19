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
        f.descripcion,
        f.total as monto,
        f.fecha,
        f.imagen_path,
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

// GET /ninos - Reporte general de niños
r.get('/ninos', authMiddleware, async (req: any, res: any) => {
  try {
    const ninosQuery = await pool.query(`
      SELECT 
        n.id,
        n.codigo,
        n.nombres,
        n.apellidos,
        n.fecha_nacimiento,
        n.genero,
        n.activo,
        EXTRACT(YEAR FROM AGE(n.fecha_nacimiento)) as edad,
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

    const nivelStats = await pool.query(`
      SELECT 
        nv.nombre as nivel,
        COUNT(n.id) as cantidad
      FROM ninos n
      LEFT JOIN niveles nv ON n.nivel_id = nv.id
      WHERE n.activo = true
      GROUP BY nv.nombre
      ORDER BY nv.nombre
    `)

    const generoStats = await pool.query(`
      SELECT 
        COALESCE(genero, 'No especificado') as genero,
        COUNT(id) as cantidad
      FROM ninos
      WHERE activo = true
      GROUP BY genero
    `)

    const edadStats = await pool.query(`
      SELECT 
        CASE 
          WHEN EXTRACT(YEAR FROM AGE(fecha_nacimiento)) < 3 THEN '0-2 años'
          WHEN EXTRACT(YEAR FROM AGE(fecha_nacimiento)) < 6 THEN '3-5 años'
          WHEN EXTRACT(YEAR FROM AGE(fecha_nacimiento)) < 12 THEN '6-11 años'
          ELSE '12+ años'
        END as rango_edad,
        COUNT(id) as cantidad
      FROM ninos
      WHERE activo = true AND fecha_nacimiento IS NOT NULL
      GROUP BY rango_edad
      ORDER BY rango_edad
    `)

    res.json({
      ninos: ninosQuery.rows,
      totalNinos: ninosQuery.rows.length,
      porNivel: nivelStats.rows,
      porGenero: generoStats.rows,
      porEdad: edadStats.rows
    })
  } catch (error: any) {
    console.error('❌ Error en GET /reportes/ninos:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /actividades - Reporte de actividades del mes
r.get('/actividades', authMiddleware, async (req: any, res: any) => {
  try {
    const { mes, anio } = req.query

    let query = `
      SELECT 
        a.id,
        a.titulo,
        a.descripcion,
        a.fecha,
        a.hora,
        TO_CHAR(a.fecha, 'Day') as dia_semana,
        TO_CHAR(a.fecha, 'DD') as dia_numero,
        TO_CHAR(a.fecha, 'Month') as mes_nombre
      FROM actividades a
      WHERE 1=1
    `
    const params: any[] = []
    let paramIndex = 1

    if (mes && anio) {
      query += ` AND EXTRACT(MONTH FROM a.fecha) = $${paramIndex}`
      params.push(mes)
      paramIndex++
      query += ` AND EXTRACT(YEAR FROM a.fecha) = $${paramIndex}`
      params.push(anio)
      paramIndex++
    }

    query += ' ORDER BY a.fecha ASC, a.hora ASC'

    const { rows } = await pool.query(query, params)

    res.json({
      actividades: rows,
      totalActividades: rows.length,
      mes: mes,
      anio: anio
    })
  } catch (error: any) {
    console.error('❌ Error en GET /reportes/actividades:', error)
    res.status(500).json({ error: error.message })
  }
})

export default r