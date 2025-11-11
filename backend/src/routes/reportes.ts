import { Router } from 'express'
import { pool } from '../core/db'

const r = Router()

// Helper: Verificar si puede ver reportes
async function puedeVerReportes(userId: string): Promise<boolean> {
  try {
    const result = await pool.query('SELECT rol FROM usuarios WHERE id = $1', [userId])
    const rol = String(result.rows[0]?.rol).toLowerCase()
    return rol === 'directora' || rol === 'contabilidad'
  } catch (error) {
    return false
  }
}

// ==================== REPORTE FINANCIERO ====================

// GET /reportes/financiero/export.csv
r.get('/reportes/financiero/export.csv', async (req: any, res: any) => {
  const userId = req.user?.id
  if (!userId) return res.status(401).send('no auth')
  
  const tieneAcceso = await puedeVerReportes(userId)
  if (!tieneAcceso) return res.status(403).send('solo directora y contabilidad')

  try {
    const { mes, anio } = req.query

    console.log('📊 Exportando reporte financiero')
    console.log('   Mes:', mes, 'Año:', anio)

    let query = `
      SELECT 
        f.numero_factura,
        f.descripcion,
        f.tipo,
        f.monto,
        f.estado,
        to_char(f.fecha_emision, 'YYYY-MM-DD') as fecha_emision,
        to_char(f.fecha_vencimiento, 'YYYY-MM-DD') as fecha_vencimiento,
        to_char(f.creado_en, 'YYYY-MM-DD HH24:MI') as fecha_subida,
        u.nombres || ' ' || COALESCE(u.apellidos, '') as creado_por
      FROM facturas f
      LEFT JOIN usuarios u ON f.creado_por = u.id
      WHERE 1=1
    `

    const params: any[] = []

    if (mes && anio) {
      params.push(anio, mes)
      query += ` AND EXTRACT(YEAR FROM f.creado_en) = $1 AND EXTRACT(MONTH FROM f.creado_en) = $2`
    }

    query += ` ORDER BY f.creado_en DESC`

    const { rows } = await pool.query(query, params)

    // Calcular totales
    const ingresos = rows.filter((f: any) => f.tipo === 'ingreso').reduce((sum: number, f: any) => sum + parseFloat(f.monto), 0)
    const egresos = rows.filter((f: any) => f.tipo === 'egreso').reduce((sum: number, f: any) => sum + parseFloat(f.monto), 0)

    // Armar CSV
    const headers = ['numero_factura', 'descripcion', 'tipo', 'monto', 'estado', 'fecha_emision', 'fecha_vencimiento', 'fecha_subida', 'creado_por']
    const escape = (s: any) => {
      const v = (s === null || s === undefined) ? '' : String(s)
      return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
    }

    const lines = [
      'No. Factura,Descripción,Tipo,Monto,Estado,Fecha Emisión,Fecha Vencimiento,Fecha Subida,Creado Por',
      ...rows.map(r => headers.map(h => escape((r as any)[h])).join(','))
    ]

    lines.push('')
    lines.push('RESUMEN,,,,,,,,')
    lines.push(`Total Ingresos,,,Q ${ingresos.toFixed(2)},,,,,`)
    lines.push(`Total Egresos,,,Q ${egresos.toFixed(2)},,,,,`)
    lines.push(`Balance,,,Q ${(ingresos - egresos).toFixed(2)},,,,,`)

    const csv = lines.join('\n')

    console.log('✅ CSV generado:', rows.length, 'facturas')

    res.setHeader('content-type', 'text/csv; charset=utf-8')
    res.setHeader('content-disposition', `attachment; filename="reporte_financiero_${mes || 'todos'}_${anio || 'todos'}.csv"`)
    res.send(csv)
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    res.status(500).send('Error al exportar')
  }
})

// ==================== REPORTE ASISTENCIA ====================

// GET /reportes/asistencia/export.csv
r.get('/reportes/asistencia/export.csv', async (req: any, res: any) => {
  const userId = req.user?.id
  if (!userId) return res.status(401).send('no auth')
  
  const tieneAcceso = await puedeVerReportes(userId)
  if (!tieneAcceso) return res.status(403).send('solo directora y contabilidad')

  try {
    const { mes, anio } = req.query

    console.log('📊 Exportando reporte asistencia')
    console.log('   Mes:', mes, 'Año:', anio)

    let query = `
      SELECT 
        to_char(a.fecha, 'YYYY-MM-DD') as fecha,
        n.nombres || ' ' || n.apellidos as nino,
        COALESCE(nv.nombre, 'Sin nivel') as nivel,
        COALESCE(sn.nombre, 'Sin subnivel') as subnivel,
        a.estado,
        u.nombres || ' ' || COALESCE(u.apellidos, '') as registrado_por
      FROM asistencia a
      JOIN ninos n ON a.nino_id = n.id
      LEFT JOIN niveles nv ON n.nivel_id = nv.id
      LEFT JOIN subniveles sn ON n.subnivel_id = sn.id
      LEFT JOIN usuarios u ON a.maestro_id = u.id
      WHERE 1=1
    `

    const params: any[] = []

    if (mes && anio) {
      params.push(anio, mes)
      query += ` AND EXTRACT(YEAR FROM a.fecha) = $1 AND EXTRACT(MONTH FROM a.fecha) = $2`
    }

    query += ` ORDER BY a.fecha DESC, n.nombres ASC`

    const { rows } = await pool.query(query, params)

    // Calcular estadísticas
    const total = rows.length
    const presentes = rows.filter((a: any) => a.estado === 'presente').length
    const ausentes = rows.filter((a: any) => a.estado === 'ausente').length
    const suplentes = rows.filter((a: any) => a.estado === 'suplente').length
    const porcentaje = total > 0 ? ((presentes / total) * 100).toFixed(2) : '0'

    // Armar CSV
    const headers = ['fecha', 'nino', 'nivel', 'subnivel', 'estado', 'registrado_por']
    const escape = (s: any) => {
      const v = (s === null || s === undefined) ? '' : String(s)
      return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
    }

    const lines = [
      'Fecha,Niño,Nivel,Subnivel,Estado,Registrado Por',
      ...rows.map(r => headers.map(h => escape((r as any)[h])).join(','))
    ]

    lines.push('')
    lines.push('RESUMEN,,,,,')
    lines.push(`Total Registros,${total},,,,`)
    lines.push(`Presentes,${presentes},,,,`)
    lines.push(`Ausentes,${ausentes},,,,`)
    lines.push(`Suplentes,${suplentes},,,,`)
    lines.push(`% Asistencia,${porcentaje}%,,,,`)

    const csv = lines.join('\n')

    console.log('✅ CSV generado:', rows.length, 'registros')

    res.setHeader('content-type', 'text/csv; charset=utf-8')
    res.setHeader('content-disposition', `attachment; filename="reporte_asistencia_${mes || 'todos'}_${anio || 'todos'}.csv"`)
    res.send(csv)
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    res.status(500).send('Error al exportar')
  }
})

// ==================== REPORTE NIÑOS ACTIVOS ====================

// GET /reportes/ninos/export.csv
r.get('/reportes/ninos/export.csv', async (req: any, res: any) => {
  const userId = req.user?.id
  if (!userId) return res.status(401).send('no auth')
  
  const tieneAcceso = await puedeVerReportes(userId)
  if (!tieneAcceso) return res.status(403).send('solo directora y contabilidad')

  try {
    console.log('📊 Exportando reporte niños activos')

    const query = `
      SELECT 
        n.codigo,
        n.nombres,
        n.apellidos,
        to_char(n.fecha_nacimiento, 'YYYY-MM-DD') as fecha_nacimiento,
        EXTRACT(YEAR FROM AGE(n.fecha_nacimiento))::int as edad,
        CASE WHEN n.genero = 'M' THEN 'Masculino' ELSE 'Femenino' END as genero,
        COALESCE(nv.nombre, 'Sin nivel') as nivel,
        COALESCE(sn.nombre, 'Sin subnivel') as subnivel,
        n.nombre_encargado as encargado,
        n.telefono_contacto as telefono,
        n.direccion
      FROM ninos n
      LEFT JOIN niveles nv ON n.nivel_id = nv.id
      LEFT JOIN subniveles sn ON n.subnivel_id = sn.id
      WHERE n.activo = true
      ORDER BY n.nombres ASC
    `

    const { rows } = await pool.query(query)

    // Armar CSV
    const headers = ['codigo', 'nombres', 'apellidos', 'fecha_nacimiento', 'edad', 'genero', 'nivel', 'subnivel', 'encargado', 'telefono', 'direccion']
    const escape = (s: any) => {
      const v = (s === null || s === undefined) ? '' : String(s)
      return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
    }

    const lines = [
      'Código,Nombres,Apellidos,Fecha Nacimiento,Edad,Género,Nivel,Subnivel,Encargado,Teléfono,Dirección',
      ...rows.map(r => headers.map(h => escape((r as any)[h])).join(','))
    ]

    lines.push('')
    lines.push('RESUMEN,,,,,,,,,,')
    lines.push(`Total Niños Activos,${rows.length},,,,,,,,`)

    const csv = lines.join('\n')

    console.log('✅ CSV generado:', rows.length, 'niños activos')

    res.setHeader('content-type', 'text/csv; charset=utf-8')
    res.setHeader('content-disposition', `attachment; filename="reporte_ninos_activos_${new Date().toISOString().split('T')[0]}.csv"`)
    res.send(csv)
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    res.status(500).send('Error al exportar')
  }
})

// ==================== REPORTE NIÑOS INACTIVOS ====================

// GET /reportes/ninos-inactivos/export.csv
r.get('/reportes/ninos-inactivos/export.csv', async (req: any, res: any) => {
  const userId = req.user?.id
  if (!userId) return res.status(401).send('no auth')
  
  const tieneAcceso = await puedeVerReportes(userId)
  if (!tieneAcceso) return res.status(403).send('solo directora y contabilidad')

  try {
    console.log('📊 Exportando reporte niños inactivos')

    const query = `
      SELECT 
        n.codigo,
        n.nombres,
        n.apellidos,
        to_char(n.fecha_nacimiento, 'YYYY-MM-DD') as fecha_nacimiento,
        EXTRACT(YEAR FROM AGE(n.fecha_nacimiento))::int as edad,
        CASE WHEN n.genero = 'M' THEN 'Masculino' ELSE 'Femenino' END as genero,
        COALESCE(nv.nombre, 'Sin nivel') as nivel,
        n.nombre_encargado as encargado,
        n.telefono_contacto as telefono,
        COALESCE(n.motivo_inactividad, 'No especificado') as motivo_inactividad,
        to_char(n.fecha_inactivacion, 'YYYY-MM-DD HH24:MI') as fecha_inactivacion
      FROM ninos n
      LEFT JOIN niveles nv ON n.nivel_id = nv.id
      WHERE n.activo = false
      ORDER BY n.fecha_inactivacion DESC NULLS LAST, n.nombres ASC
    `

    const { rows } = await pool.query(query)

    // Armar CSV
    const headers = ['codigo', 'nombres', 'apellidos', 'fecha_nacimiento', 'edad', 'genero', 'nivel', 'encargado', 'telefono', 'motivo_inactividad', 'fecha_inactivacion']
    const escape = (s: any) => {
      const v = (s === null || s === undefined) ? '' : String(s)
      return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
    }

    const lines = [
      'Código,Nombres,Apellidos,Fecha Nacimiento,Edad,Género,Nivel,Encargado,Teléfono,Motivo Inactividad,Fecha Inactivación',
      ...rows.map(r => headers.map(h => escape((r as any)[h])).join(','))
    ]

    lines.push('')
    lines.push('RESUMEN,,,,,,,,,,')
    lines.push(`Total Niños Inactivos,${rows.length},,,,,,,,`)

    const csv = lines.join('\n')

    console.log('✅ CSV generado:', rows.length, 'niños inactivos')

    res.setHeader('content-type', 'text/csv; charset=utf-8')
    res.setHeader('content-disposition', `attachment; filename="reporte_ninos_inactivos_${new Date().toISOString().split('T')[0]}.csv"`)
    res.send(csv)
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    res.status(500).send('Error al exportar')
  }
})

export default r