// src/routes/reportes.ts
import { Router } from 'express'
import { pool } from '../core/db'

const router = Router()

// Helper: Verificar si es directora o contabilidad
async function puedeVerReportes(userId: string): Promise<boolean> {
  try {
    const result = await pool.query('SELECT rol FROM usuarios WHERE id = $1', [userId])
    const rol = String(result.rows[0]?.rol).toLowerCase()
    return rol === 'directora' || rol === 'contabilidad'
  } catch (error) {
    return false
  }
}

// Middleware para verificar acceso
const verificarAccesoReportes = async (req: any, res: any, next: any) => {
  const userId = req.user?.id
  
  if (!userId) {
    return res.status(401).json({ error: 'No autenticado' })
  }

  const tieneAcceso = await puedeVerReportes(userId)
  
  if (!tieneAcceso) {
    return res.status(403).json({ error: 'Solo directora y contabilidad pueden acceder a reportes' })
  }

  next()
}

// Aplicar middleware a todas las rutas
router.use(verificarAccesoReportes)

// GET /reportes/financiero - Reporte de facturas por rango de fechas
router.get('/financiero', async (req: any, res: any) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query

    console.log('📊 Reporte Financiero')
    console.log('   Desde:', fecha_inicio)
    console.log('   Hasta:', fecha_fin)

    let query = `
      SELECT 
        f.id,
        f.numero_factura,
        f.descripcion,
        f.monto,
        f.tipo,
        f.estado,
        f.fecha_emision,
        f.fecha_vencimiento,
        f.creado_en,
        u.nombres || ' ' || COALESCE(u.apellidos, '') as creado_por_nombre
      FROM facturas f
      LEFT JOIN usuarios u ON f.creado_por = u.id
      WHERE 1=1
    `

    const params: any[] = []

    if (fecha_inicio) {
      params.push(fecha_inicio)
      query += ` AND f.creado_en >= $${params.length}::date`
    }

    if (fecha_fin) {
      params.push(fecha_fin)
      query += ` AND f.creado_en <= $${params.length}::date + INTERVAL '1 day'`
    }

    query += ` ORDER BY f.creado_en DESC`

    const result = await pool.query(query, params)

    // Calcular totales
    const ingresos = result.rows
      .filter((f: any) => f.tipo === 'ingreso')
      .reduce((sum: number, f: any) => sum + parseFloat(f.monto), 0)

    const egresos = result.rows
      .filter((f: any) => f.tipo === 'egreso')
      .reduce((sum: number, f: any) => sum + parseFloat(f.monto), 0)

    const balance = ingresos - egresos

    console.log('✅ Facturas encontradas:', result.rows.length)
    console.log('   Ingresos: Q', ingresos.toFixed(2))
    console.log('   Egresos: Q', egresos.toFixed(2))
    console.log('   Balance: Q', balance.toFixed(2))

    res.json({
      facturas: result.rows,
      resumen: {
        total_facturas: result.rows.length,
        ingresos: ingresos.toFixed(2),
        egresos: egresos.toFixed(2),
        balance: balance.toFixed(2),
        fecha_inicio: fecha_inicio || null,
        fecha_fin: fecha_fin || null
      }
    })
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    res.status(500).json({ error: 'Error al generar reporte financiero' })
  }
})

// GET /reportes/asistencia - Reporte de asistencia mensual
router.get('/asistencia', async (req: any, res: any) => {
  try {
    const { mes, anio } = req.query

    console.log('📊 Reporte Asistencia')
    console.log('   Mes:', mes)
    console.log('   Año:', anio)

    let query = `
      SELECT 
        a.id,
        a.fecha,
        a.estado,
        n.nombres || ' ' || n.apellidos as nino_nombre,
        nv.nombre as nivel_nombre,
        sn.nombre as subnivel_nombre,
        u.nombres || ' ' || COALESCE(u.apellidos, '') as registrado_por_nombre
      FROM asistencia a
      JOIN ninos n ON a.nino_id = n.id
      LEFT JOIN niveles nv ON n.nivel_id = nv.id
      LEFT JOIN subniveles sn ON n.subnivel_id = sn.id
      LEFT JOIN usuarios u ON a.registrado_por = u.id
      WHERE 1=1
    `

    const params: any[] = []

    if (mes && anio) {
      params.push(anio, mes)
      query += ` AND EXTRACT(YEAR FROM a.fecha) = $1 AND EXTRACT(MONTH FROM a.fecha) = $2`
    }

    query += ` ORDER BY a.fecha DESC, n.nombres ASC`

    const result = await pool.query(query, params)

    // Calcular estadísticas
    const total = result.rows.length
    const presentes = result.rows.filter((a: any) => a.estado === 'presente').length
    const ausentes = result.rows.filter((a: any) => a.estado === 'ausente').length
    const justificados = result.rows.filter((a: any) => a.estado === 'justificado').length

    const porcentajeAsistencia = total > 0 ? ((presentes / total) * 100).toFixed(2) : '0'

    console.log('✅ Registros encontrados:', total)
    console.log('   Presentes:', presentes)
    console.log('   Ausentes:', ausentes)
    console.log('   % Asistencia:', porcentajeAsistencia)

    res.json({
      asistencias: result.rows,
      resumen: {
        total_registros: total,
        presentes,
        ausentes,
        justificados,
        porcentaje_asistencia: porcentajeAsistencia,
        mes: mes || null,
        anio: anio || null
      }
    })
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    res.status(500).json({ error: 'Error al generar reporte de asistencia' })
  }
})

// GET /reportes/ninos - Reporte estadístico de niños
router.get('/ninos', async (req: any, res: any) => {
  try {
    console.log('📊 Reporte Estadísticas de Niños')

    // Obtener todos los niños con sus datos
    const ninosQuery = `
      SELECT 
        n.id,
        n.nombres,
        n.apellidos,
        n.fecha_nacimiento,
        n.genero,
        n.direccion,
        n.telefono_contacto,
        n.nombre_encargado,
        n.activo,
        nv.nombre as nivel_nombre,
        sn.nombre as subnivel_nombre,
        EXTRACT(YEAR FROM AGE(n.fecha_nacimiento)) as edad
      FROM ninos n
      LEFT JOIN niveles nv ON n.nivel_id = nv.id
      LEFT JOIN subniveles sn ON n.subnivel_id = sn.id
      ORDER BY n.nombres ASC
    `

    const ninosResult = await pool.query(ninosQuery)

    // Estadísticas por nivel
    const porNivelQuery = `
      SELECT 
        nv.nombre as nivel,
        COUNT(n.id) as cantidad
      FROM ninos n
      LEFT JOIN niveles nv ON n.nivel_id = nv.id
      WHERE n.activo = true
      GROUP BY nv.nombre
      ORDER BY cantidad DESC
    `

    const porNivelResult = await pool.query(porNivelQuery)

    // Estadísticas por género
    const porGeneroQuery = `
      SELECT 
        genero,
        COUNT(*) as cantidad
      FROM ninos
      WHERE activo = true
      GROUP BY genero
    `

    const porGeneroResult = await pool.query(porGeneroQuery)

    // Estadísticas por edad
    const porEdadQuery = `
      SELECT 
        CASE 
          WHEN EXTRACT(YEAR FROM AGE(fecha_nacimiento)) < 5 THEN '0-4 años'
          WHEN EXTRACT(YEAR FROM AGE(fecha_nacimiento)) BETWEEN 5 AND 9 THEN '5-9 años'
          WHEN EXTRACT(YEAR FROM AGE(fecha_nacimiento)) BETWEEN 10 AND 14 THEN '10-14 años'
          ELSE '15+ años'
        END as rango_edad,
        COUNT(*) as cantidad
      FROM ninos
      WHERE activo = true
      GROUP BY rango_edad
      ORDER BY rango_edad
    `

    const porEdadResult = await pool.query(porEdadQuery)

    const totalNinos = ninosResult.rows.filter((n: any) => n.activo).length
    const ninosInactivos = ninosResult.rows.filter((n: any) => !n.activo).length

    console.log('✅ Total niños activos:', totalNinos)
    console.log('   Niños inactivos:', ninosInactivos)

    res.json({
      ninos: ninosResult.rows,
      resumen: {
        total_ninos: totalNinos,
        ninos_inactivos: ninosInactivos,
        por_nivel: porNivelResult.rows,
        por_genero: porGeneroResult.rows,
        por_edad: porEdadResult.rows
      }
    })
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    res.status(500).json({ error: 'Error al generar reporte de niños' })
  }
})

export default router