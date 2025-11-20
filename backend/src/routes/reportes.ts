import { Router } from 'express'
import { authMiddleware } from '../core/auth_middleware'
import { pool } from '../core/db'

const r = Router()

// GET /ping - Health check
r.get('/ping', (req: any, res: any) => {
  res.json({ ok: true, message: 'reportes ok' })
})

// GET /financiero - NO SE TOCA, ESTÁ BIEN
r.get('/financiero', authMiddleware, async (req: any, res: any) => {
  try {
    const { desde, hasta } = req.query

    let query = `
      SELECT 
        f.id,
        f.descripcion,
        f.total,
        f.fecha,
        f.imagen_path,
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
    console.error('❌ Error en GET /reportes/financiero:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /ninos - SOLO LOS DATOS QUE PEDISTE
r.get('/ninos', authMiddleware, async (req: any, res: any) => {
  try {
    console.log('📊 GET /reportes/ninos - Listado oficial')

    const { rows } = await pool.query(`
      SELECT 
        n.codigo,
        n.nombres,
        n.apellidos,
        CASE 
          WHEN n.fecha_nacimiento IS NOT NULL 
          THEN EXTRACT(YEAR FROM AGE(n.fecha_nacimiento))
          ELSE NULL
        END as edad,
        u.nombres || ' ' || COALESCE(u.apellidos, '') as maestro_a_cargo,
        n.nombre_encargado,
        n.telefono_contacto as telefono_encargado,
        n.direccion as direccion_encargado
      FROM ninos n
      LEFT JOIN usuarios u ON n.maestro_id = u.id
      WHERE n.activo = true
      ORDER BY n.apellidos, n.nombres
    `)

    console.log('✅ Total niños activos:', rows.length)

    res.json({
      ninos: rows,
      totalNinos: rows.length
    })
  } catch (error: any) {
    console.error('❌ Error en GET /reportes/ninos:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /actividades - SOLO LOS DATOS QUE PEDISTE
r.get('/actividades', authMiddleware, async (req: any, res: any) => {
  try {
    const { mes, anio } = req.query

    console.log('📊 GET /reportes/actividades:', { mes, anio })

    if (!mes || !anio) {
      return res.status(400).json({ error: 'Mes y año son requeridos' })
    }

    const { rows } = await pool.query(`
      SELECT 
        TO_CHAR(fecha, 'DD/MM/YYYY') as fecha,
        titulo,
        descripcion,
        estado
      FROM actividades
      WHERE EXTRACT(MONTH FROM fecha) = $1
        AND EXTRACT(YEAR FROM fecha) = $2
      ORDER BY fecha ASC
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