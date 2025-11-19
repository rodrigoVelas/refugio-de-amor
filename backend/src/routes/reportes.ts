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

    console.log('📊 Reporte Financiero:', { desde, hasta })

    let query = `
      SELECT 
        f.id,
        f.descripcion,
        f.total,
        f.fecha,
        f.imagen_path,
        f.creado_en,
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

    console.log('✅ Facturas encontradas:', rows.length)

    // Calcular totales
    const totalGeneral = rows.reduce((sum, row) => sum + parseFloat(row.total || 0), 0)

    res.json({
      facturas: rows,
      total: totalGeneral.toFixed(2),
      count: rows.length,
      periodo: { desde, hasta }
    })
  } catch (error: any) {
    console.error('❌ Error en GET /reportes/financiero:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /ninos - Reporte de niños con estadísticas
r.get('/ninos', authMiddleware, async (req: any, res: any) => {
  try {
    console.log('📊 Reporte de Niños')

    // Obtener TODOS los niños activos
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
          WHEN 'Sin especificar' THEN 5
          WHEN '0-2 años' THEN 1
          WHEN '3-5 años' THEN 2
          WHEN '6-11 años' THEN 3
          WHEN '12+ años' THEN 4
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
    console.error('❌ Error en GET /reportes/ninos:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /actividades - Reporte de actividades del mes
r.get('/actividades', authMiddleware, async (req: any, res: any) => {
  try {
    const { mes, anio } = req.query

    console.log('📊 Reporte de Actividades:', { mes, anio })

    if (!mes || !anio) {
      return res.status(400).json({ error: 'Mes y año son requeridos' })
    }

    const { rows } = await pool.query(`
      SELECT 
        a.id,
        a.titulo,
        a.descripcion,
        a.fecha,
        a.hora,
        a.ubicacion,
        TO_CHAR(a.fecha, 'Day') as dia_semana,
        TO_CHAR(a.fecha, 'DD') as dia_numero,
        TO_CHAR(a.fecha, 'Month') as mes_nombre,
        TO_CHAR(a.fecha, 'DD/MM/YYYY') as fecha_formato
      FROM actividades a
      WHERE EXTRACT(MONTH FROM a.fecha) = $1
        AND EXTRACT(YEAR FROM a.fecha) = $2
      ORDER BY a.fecha ASC, a.hora ASC
    `, [mes, anio])

    console.log('✅ Actividades encontradas:', rows.length)

    res.json({
      actividades: rows,
      totalActividades: rows.length,
      mes: parseInt(mes),
      anio: parseInt(anio)
    })
  } catch (error: any) {
    console.error('❌ Error en GET /reportes/actividades:', error)
    res.status(500).json({ error: error.message })
  }
})

export default r