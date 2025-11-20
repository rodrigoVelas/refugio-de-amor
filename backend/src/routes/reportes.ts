import { Router } from 'express'
import { authMiddleware } from '../core/auth_middleware'
import { pool } from '../core/db'

const r = Router()

r.get('/ping', (req: any, res: any) => {
  res.json({ ok: true, message: 'reportes ok' })
})

// GET /financiero
r.get('/financiero', authMiddleware, async (req: any, res: any) => {
  try {
    const { desde, hasta } = req.query
    let query = `
      SELECT f.id, f.descripcion, f.total, f.fecha, f.imagen_path,
             u.nombres || ' ' || COALESCE(u.apellidos, '') as usuario_nombre
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
    const total = rows.reduce((sum, row) => sum + parseFloat(row.total || 0), 0)

    res.json({
      facturas: rows,
      total: total.toFixed(2),
      count: rows.length,
      periodo: { desde, hasta }
    })
  } catch (error: any) {
    console.error('❌ Error /reportes/financiero:', error.message)
    res.status(500).json({ error: error.message })
  }
})

// GET /ninos - CON TUS COLUMNAS EXACTAS
r.get('/ninos', authMiddleware, async (req: any, res: any) => {
  try {
    console.log('📊 GET /reportes/ninos')

    // Query con TUS columnas reales
    const ninosQuery = await pool.query(`
      SELECT 
        n.id,
        n.codigo,
        n.nombres,
        n.apellidos,
        n.fecha_nacimiento,
        n.genero,
        n.direccion,
        n.telefono_contacto,
        n.nombre_encargado,
        n.activo,
        CASE 
          WHEN n.fecha_nacimiento IS NOT NULL 
          THEN EXTRACT(YEAR FROM AGE(n.fecha_nacimiento))
          ELSE NULL
        END as edad,
        nv.nombre as nivel_nombre,
        sn.nombre as subnivel_nombre,
        u.nombres || ' ' || COALESCE(u.apellidos, '') as colaborador_nombre
      FROM ninos n
      LEFT JOIN niveles nv ON n.nivel_id = nv.id
      LEFT JOIN subniveles sn ON n.subnivel_id = sn.id
      LEFT JOIN usuarios u ON n.maestro_id = u.id
      WHERE n.activo = true
      ORDER BY n.apellidos, n.nombres
    `)

    // Estadísticas por nivel
    const nivelStats = await pool.query(`
      SELECT 
        COALESCE(nv.nombre, 'Sin nivel') as nivel,
        COUNT(n.id) as cantidad
      FROM ninos n
      LEFT JOIN niveles nv ON n.nivel_id = nv.id
      WHERE n.activo = true
      GROUP BY nv.nombre
      ORDER BY cantidad DESC
    `)

    // Estadísticas por género
    const generoStats = await pool.query(`
      SELECT 
        COALESCE(genero, 'No especificado') as genero,
        COUNT(id) as cantidad
      FROM ninos
      WHERE activo = true
      GROUP BY genero
      ORDER BY cantidad DESC
    `)

    // Estadísticas por edad
    const edadStats = await pool.query(`
      SELECT 
        CASE 
          WHEN fecha_nacimiento IS NULL THEN 'Sin especificar'
          WHEN EXTRACT(YEAR FROM AGE(fecha_nacimiento)) < 3 THEN '0-2 años'
          WHEN EXTRACT(YEAR FROM AGE(fecha_nacimiento)) < 6 THEN '3-5 años'
          WHEN EXTRACT(YEAR FROM AGE(fecha_nacimiento)) < 12 THEN '6-11 años'
          ELSE '12+ años'
        END as rango_edad,
        COUNT(id) as cantidad
      FROM ninos
      WHERE activo = true
      GROUP BY rango_edad
      ORDER BY 
        CASE rango_edad
          WHEN '0-2 años' THEN 1
          WHEN '3-5 años' THEN 2
          WHEN '6-11 años' THEN 3
          WHEN '12+ años' THEN 4
          ELSE 5
        END
    `)

    console.log('✅ Total niños:', ninosQuery.rows.length)

    res.json({
      ninos: ninosQuery.rows,
      totalNinos: ninosQuery.rows.length,
      porNivel: nivelStats.rows,
      porGenero: generoStats.rows,
      porEdad: edadStats.rows
    })
  } catch (error: any) {
    console.error('❌ Error /reportes/ninos:', error.message)
    res.status(500).json({ error: error.message })
  }
})

// GET /actividades - CON TUS COLUMNAS EXACTAS
r.get('/actividades', authMiddleware, async (req: any, res: any) => {
  try {
    const { mes, anio } = req.query

    console.log('📊 GET /reportes/actividades:', { mes, anio })

    if (!mes || !anio) {
      return res.status(400).json({ error: 'Mes y año son requeridos' })
    }

    const { rows } = await pool.query(`
      SELECT 
        id,
        titulo,
        descripcion,
        fecha,
        hora,
        estado,
        TO_CHAR(fecha, 'DD/MM/YYYY') as fecha_formato
      FROM actividades
      WHERE EXTRACT(MONTH FROM fecha) = $1
        AND EXTRACT(YEAR FROM fecha) = $2
      ORDER BY fecha ASC, 
               CASE WHEN hora IS NULL THEN 1 ELSE 0 END,
               hora ASC
    `, [mes, anio])

    console.log('✅ Actividades encontradas:', rows.length)

    res.json({
      actividades: rows,
      totalActividades: rows.length,
      mes: parseInt(mes),
      anio: parseInt(anio)
    })
  } catch (error: any) {
    console.error('❌ Error /reportes/actividades:', error.message)
    res.status(500).json({ error: error.message })
  }
})

export default r