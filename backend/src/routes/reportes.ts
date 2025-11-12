import { Router } from 'express'
import { pool } from '../core/db'

const r = Router()

console.log('🔵 Módulo reportes cargado')

// Verificar permisos
async function puedeVerReportes(userId: string): Promise<boolean> {
  try {
    const result = await pool.query('SELECT rol FROM usuarios WHERE id = $1', [userId])
    const rol = String(result.rows[0]?.rol).toLowerCase()
    return rol === 'directora' || rol === 'contabilidad'
  } catch (error) {
    return false
  }
}

// Ping test
r.get('/reportes/ping', (_req, res) => res.json({ ok: true, message: 'reportes funcionando' }))

// REPORTE FINANCIERO
r.get('/reportes/financiero', async (req: any, res: any) => {
  const userId = req.user?.id
  if (!userId) return res.status(401).send('no auth')
  
  const puede = await puedeVerReportes(userId)
  if (!puede) return res.status(403).send('acceso denegado')

  const { mes, anio } = req.query
  
  console.log('📊 Descargando reporte financiero, mes:', mes, 'año:', anio)

  try {
    let q = `SELECT 
      f.numero_factura, f.descripcion, f.tipo, f.monto, f.estado,
      to_char(f.fecha_emision, 'YYYY-MM-DD') as fecha_emision,
      to_char(f.creado_en, 'YYYY-MM-DD') as creado_en,
      u.nombres as creado_por
    FROM facturas f
    LEFT JOIN usuarios u ON f.creado_por = u.id
    WHERE 1=1`

    const params: any[] = []
    if (mes && anio) {
      params.push(anio, mes)
      q += ` AND EXTRACT(YEAR FROM f.creado_en) = $1 AND EXTRACT(MONTH FROM f.creado_en) = $2`
    }
    q += ` ORDER BY f.creado_en DESC`

    const { rows } = await pool.query(q, params)
    
    const ingresos = rows.filter(f => f.tipo === 'ingreso').reduce((s, f) => s + parseFloat(f.monto), 0)
    const egresos = rows.filter(f => f.tipo === 'egreso').reduce((s, f) => s + parseFloat(f.monto), 0)

    const escape = (s: any) => {
      const v = s == null ? '' : String(s)
      return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
    }

    const lines = [
      'No. Factura,Descripción,Tipo,Monto,Estado,Fecha Emisión,Creado En,Creado Por',
      ...rows.map(r => `${escape(r.numero_factura)},${escape(r.descripcion)},${escape(r.tipo)},${escape(r.monto)},${escape(r.estado)},${escape(r.fecha_emision)},${escape(r.creado_en)},${escape(r.creado_por)}`),
      '',
      'RESUMEN',
      `Ingresos,,,Q ${ingresos.toFixed(2)}`,
      `Egresos,,,Q ${egresos.toFixed(2)}`,
      `Balance,,,Q ${(ingresos - egresos).toFixed(2)}`
    ]

    const csv = lines.join('\n')
    
    res.setHeader('content-type', 'text/csv; charset=utf-8')
    res.setHeader('content-disposition', `attachment; filename="financiero_${mes}_${anio}.csv"`)
    res.send(csv)
  } catch (error: any) {
    console.error('Error:', error)
    res.status(500).send('error')
  }
})

// REPORTE ASISTENCIA
// GET /reportes/asistencia/datos - Obtener datos de asistencia
r.get('/reportes/asistencia/datos', async (req: any, res: any) => {
  const userId = req.user?.id
  if (!userId) return res.status(401).json({ error: 'no auth' })

  try {
    const { mes, anio } = req.query

    console.log('📊 Obteniendo datos de asistencia')
    console.log('   Mes:', mes, 'Año:', anio)

    if (!mes || !anio) {
      return res.status(400).json({ error: 'Mes y año son requeridos' })
    }

    // Consulta directa a la tabla asistencia
    const query = `
      SELECT 
        to_char(a.fecha, 'YYYY-MM-DD') as fecha,
        to_char(a.fecha, 'DD/MM/YYYY') as fecha_formato,
        n.nombres || ' ' || n.apellidos as nino_nombre,
        COALESCE(nv.nombre, 'Sin nivel') as nivel,
        a.estado,
        a.nota
      FROM asistencia a
      JOIN ninos n ON a.nino_id = n.id
      LEFT JOIN niveles nv ON n.nivel_id = nv.id
      WHERE EXTRACT(YEAR FROM a.fecha) = $1 
        AND EXTRACT(MONTH FROM a.fecha) = $2
      ORDER BY a.fecha DESC, n.nombres ASC
    `

    const { rows } = await pool.query(query, [anio, mes])

    console.log('   Registros encontrados:', rows.length)

    // Calcular estadísticas
    const total = rows.length
    const presentes = rows.filter(a => a.estado === 'presente').length
    const ausentes = rows.filter(a => a.estado === 'ausente').length
    const suplentes = rows.filter(a => a.estado === 'suplente').length
    const porcentaje = total > 0 ? ((presentes / total) * 100).toFixed(2) : '0'

    res.json({
      registros: rows,
      resumen: {
        total_registros: total,
        presentes,
        ausentes,
        suplentes,
        porcentaje_asistencia: porcentaje
      }
    })
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    res.status(500).json({ error: 'Error al obtener datos' })
  }
})

// GET /reportes/ninos-inactivos/datos - Obtener niños inactivos
r.get('/reportes/ninos-inactivos/datos', async (req: any, res: any) => {
  const userId = req.user?.id
  if (!userId) return res.status(401).json({ error: 'no auth' })

  try {
    console.log('🚪 Obteniendo niños inactivos')

    const query = `
      SELECT 
        ni.*,
        nv.nombre as nivel_nombre,
        u.nombres || ' ' || COALESCE(u.apellidos, '') as maestro_nombre,
        EXTRACT(YEAR FROM AGE(ni.fecha_nacimiento))::int as edad
      FROM ninos_inactivos ni
      LEFT JOIN niveles nv ON ni.nivel_id = nv.id
      LEFT JOIN usuarios u ON ni.maestro_id = u.id
      ORDER BY ni.fecha_inactivacion DESC
    `

    const { rows } = await pool.query(query)

    console.log('   Niños inactivos encontrados:', rows.length)

    res.json(rows)
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    res.status(500).json({ error: 'Error al obtener datos' })
  }
})

// REPORTE NIÑOS ACTIVOS
r.get('/reportes/ninos', async (req: any, res: any) => {
  const userId = req.user?.id
  if (!userId) return res.status(401).send('no auth')
  
  const puede = await puedeVerReportes(userId)
  if (!puede) return res.status(403).send('acceso denegado')

  console.log('📊 Descargando reporte niños activos')

  try {
    const { rows } = await pool.query(`
      SELECT 
        n.codigo, n.nombres, n.apellidos,
        to_char(n.fecha_nacimiento, 'YYYY-MM-DD') as fecha_nac,
        EXTRACT(YEAR FROM AGE(n.fecha_nacimiento))::int as edad,
        nv.nombre as nivel
      FROM ninos n
      LEFT JOIN niveles nv ON n.nivel_id = nv.id
      WHERE n.activo = true
      ORDER BY n.nombres
    `)

    const escape = (s: any) => {
      const v = s == null ? '' : String(s)
      return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
    }

    const lines = [
      'Código,Nombres,Apellidos,Fecha Nacimiento,Edad,Nivel',
      ...rows.map(r => `${escape(r.codigo)},${escape(r.nombres)},${escape(r.apellidos)},${escape(r.fecha_nac)},${escape(r.edad)},${escape(r.nivel)}`),
      '',
      `Total,${rows.length}`
    ]

    const csv = lines.join('\n')
    
    res.setHeader('content-type', 'text/csv; charset=utf-8')
    res.setHeader('content-disposition', `attachment; filename="ninos_activos.csv"`)
    res.send(csv)
  } catch (error: any) {
    console.error('Error:', error)
    res.status(500).send('error')
  }
})

// REPORTE NIÑOS INACTIVOS
r.get('/reportes/inactivos', async (req: any, res: any) => {
  const userId = req.user?.id
  if (!userId) return res.status(401).send('no auth')
  
  const puede = await puedeVerReportes(userId)
  if (!puede) return res.status(403).send('acceso denegado')

  console.log('📊 Descargando reporte niños inactivos')

  try {
    const { rows } = await pool.query(`
      SELECT 
        n.codigo, n.nombres, n.apellidos,
        to_char(n.fecha_nacimiento, 'YYYY-MM-DD') as fecha_nac,
        n.motivo_inactividad,
        to_char(n.fecha_inactivacion, 'YYYY-MM-DD') as fecha_inact
      FROM ninos n
      WHERE n.activo = false
      ORDER BY n.fecha_inactivacion DESC NULLS LAST
    `)

    const escape = (s: any) => {
      const v = s == null ? '' : String(s)
      return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
    }

    const lines = [
      'Código,Nombres,Apellidos,Fecha Nacimiento,Motivo,Fecha Inactivación',
      ...rows.map(r => `${escape(r.codigo)},${escape(r.nombres)},${escape(r.apellidos)},${escape(r.fecha_nac)},${escape(r.motivo_inactividad)},${escape(r.fecha_inact)}`),
      '',
      `Total,${rows.length}`
    ]

    const csv = lines.join('\n')
    
    res.setHeader('content-type', 'text/csv; charset=utf-8')
    res.setHeader('content-disposition', `attachment; filename="ninos_inactivos.csv"`)
    res.send(csv)
  } catch (error: any) {
    console.error('Error:', error)
    res.status(500).send('error')
  }
})

console.log('✅ Rutas de reportes registradas')

export default r