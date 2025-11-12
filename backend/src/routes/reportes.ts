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
r.get('/reportes/asistencia', async (req: any, res: any) => {
  const userId = req.user?.id
  if (!userId) return res.status(401).send('no auth')
  
  const puede = await puedeVerReportes(userId)
  if (!puede) return res.status(403).send('acceso denegado')

  const { mes, anio } = req.query
  
  console.log('📊 Descargando reporte asistencia, mes:', mes, 'año:', anio)

  try {
    let q = `SELECT 
      to_char(a.fecha, 'YYYY-MM-DD') as fecha,
      n.nombres || ' ' || n.apellidos as nino,
      nv.nombre as nivel,
      a.estado
    FROM asistencia a
    JOIN ninos n ON a.nino_id = n.id
    LEFT JOIN niveles nv ON n.nivel_id = nv.id
    WHERE 1=1`

    const params: any[] = []
    if (mes && anio) {
      params.push(anio, mes)
      q += ` AND EXTRACT(YEAR FROM a.fecha) = $1 AND EXTRACT(MONTH FROM a.fecha) = $2`
    }
    q += ` ORDER BY a.fecha DESC`

    const { rows } = await pool.query(q, params)
    
    const total = rows.length
    const presentes = rows.filter(a => a.estado === 'presente').length

    const escape = (s: any) => {
      const v = s == null ? '' : String(s)
      return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
    }

    const lines = [
      'Fecha,Niño,Nivel,Estado',
      ...rows.map(r => `${escape(r.fecha)},${escape(r.nino)},${escape(r.nivel)},${escape(r.estado)}`),
      '',
      'RESUMEN',
      `Total,${total}`,
      `Presentes,${presentes}`,
      `% Asistencia,${total > 0 ? ((presentes/total)*100).toFixed(2) : 0}%`
    ]

    const csv = lines.join('\n')
    
    res.setHeader('content-type', 'text/csv; charset=utf-8')
    res.setHeader('content-disposition', `attachment; filename="asistencia_${mes}_${anio}.csv"`)
    res.send(csv)
  } catch (error: any) {
    console.error('Error:', error)
    res.status(500).send('error')
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