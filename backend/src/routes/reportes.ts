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

// Middleware para verificar acceso a reportes
async function verificarAcceso(req: any, res: any, next: any) {
  const userId = req.user?.id
  if (!userId) return res.status(401).send('no auth')

  const tieneAcceso = await puedeVerReportes(userId)
  if (!tieneAcceso) return res.status(403).send('solo directora y contabilidad')

  next()
}

// ==================== REPORTE FINANCIERO ====================

// GET /financiero - Reporte de facturas (JSON)
r.get('/financiero', verificarAcceso, async (req: any, res: any) => {
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
        to_char(f.fecha_emision, 'YYYY-MM-DD') as fecha_emision,
        to_char(f.fecha_vencimiento, 'YYYY-MM-DD') as fecha_vencimiento,
        to_char(f.creado_en, 'YYYY-MM-DD') as creado_en,
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

    const { rows } = await pool.query(query, params)

    // Calcular totales
    const ingresos = rows
      .filter((f: any) => f.tipo === 'ingreso')
      .reduce((sum: number, f: any) => sum + parseFloat(f.monto), 0)

    const egresos = rows
      .filter((f: any) => f.tipo === 'egreso')
      .reduce((sum: number, f: any) => sum + parseFloat(f.monto), 0)

    const balance = ingresos - egresos

    console.log('✅ Facturas:', rows.length)
    console.log('   Ingresos: Q', ingresos.toFixed(2))
    console.log('   Egresos: Q', egresos.toFixed(2))

    res.json({
      facturas: rows,
      resumen: {
        total_facturas: rows.length,
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

// GET /financiero/export.csv - Exportar facturas a CSV
r.get('/financiero/export.csv', verificarAcceso, async (req: any, res: any) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query

    console.log('📥 Exportando reporte financiero CSV')
    console.log('   Desde:', fecha_inicio)
    console.log('   Hasta:', fecha_fin)

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

    if (fecha_inicio) {
      params.push(fecha_inicio)
      query += ` AND f.creado_en >= $${params.length}::date`
    }

    if (fecha_fin) {
      params.push(fecha_fin)
      query += ` AND f.creado_en <= $${params.length}::date + INTERVAL '1 day'`
    }

    query += ` ORDER BY f.creado_en DESC`

    const { rows } = await pool.query(query, params)

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

    // Agregar totales al final
    const ingresos = rows.filter((f: any) => f.tipo === 'ingreso').reduce((sum: number, f: any) => sum + parseFloat(f.monto), 0)
    const egresos = rows.filter((f: any) => f.tipo === 'egreso').reduce((sum: number, f: any) => sum + parseFloat(f.monto), 0)
    
    lines.push('')
    lines.push('RESUMEN,,,,,,,,')
    lines.push(`Total Ingresos,,,Q ${ingresos.toFixed(2)},,,,,`)
    lines.push(`Total Egresos,,,Q ${egresos.toFixed(2)},,,,,`)
    lines.push(`Balance,,,Q ${(ingresos - egresos).toFixed(2)},,,,,`)

    const csv = lines.join('\n')

    console.log('✅ CSV generado:', rows.length, 'facturas')

    res.setHeader('content-type', 'text/csv; charset=utf-8')
    res.setHeader('content-disposition', `attachment; filename="reporte_financiero_${fecha_inicio || 'todos'}_${fecha_fin || 'todos'}.csv"`)
    res.send(csv)
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    res.status(500).send('Error al exportar')
  }
})

// ==================== REPORTE ASISTENCIA ====================

// GET /asistencia - Reporte de asistencia mensual (JSON)
r.get('/asistencia', verificarAcceso, async (req: any, res: any) => {
  try {
    const { mes, anio } = req.query

    console.log('📊 Reporte Asistencia')
    console.log('   Mes:', mes)
    console.log('   Año:', anio)

    let query = `
      SELECT 
        a.id,
        to_char(a.fecha, 'YYYY-MM-DD') as fecha,
        a.estado,
        n.nombres || ' ' || n.apellidos as nino_nombre,
        nv.nombre as nivel_nombre,
        sn.nombre as subnivel_nombre,
        u.nombres || ' ' || COALESCE(u.apellidos, '') as registrado_por_nombre
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

    const porcentajeAsistencia = total > 0 ? ((presentes / total) * 100).toFixed(2) : '0'

    console.log('✅ Registros:', total)

    res.json({
      asistencias: rows,
      resumen: {
        total_registros: total,
        presentes,
        ausentes,
        suplentes,
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

// GET /asistencia/export.csv - Exportar asistencia a CSV
r.get('/asistencia/export.csv', verificarAcceso, async (req: any, res: any) => {
  try {
    const { mes, anio } = req.query

    console.log('📥 Exportando reporte asistencia CSV')
    console.log('   Mes:', mes, '| Año:', anio)

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

    // Agregar resumen
    const total = rows.length
    const presentes = rows.filter((a: any) => a.estado === 'presente').length
    const ausentes = rows.filter((a: any) => a.estado === 'ausente').length
    const suplentes = rows.filter((a: any) => a.estado === 'suplente').length
    const porcentaje = total > 0 ? ((presentes / total) * 100).toFixed(2) : '0'

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

// ==================== REPORTE NIÑOS ====================

// GET /ninos - Reporte estadístico de niños (JSON)
r.get('/ninos', verificarAcceso, async (req: any, res: any) => {
  try {
    console.log('📊 Reporte Estadísticas de Niños')

    // Obtener todos los niños
    const ninosQuery = `
      SELECT 
        n.id,
        n.nombres,
        n.apellidos,
        to_char(n.fecha_nacimiento, 'YYYY-MM-DD') as fecha_nacimiento,
        n.genero,
        n.direccion,
        n.telefono_contacto,
        n.nombre_encargado,
        n.activo,
        COALESCE(nv.nombre, 'Sin nivel') as nivel_nombre,
        COALESCE(sn.nombre, 'Sin subnivel') as subnivel_nombre,
        EXTRACT(YEAR FROM AGE(n.fecha_nacimiento))::int as edad
      FROM ninos n
      LEFT JOIN niveles nv ON n.nivel_id = nv.id
      LEFT JOIN subniveles sn ON n.subnivel_id = sn.id
      WHERE n.activo = true
      ORDER BY n.nombres ASC
    `

    const ninosResult = await pool.query(ninosQuery)

    // Estadísticas por nivel
    const porNivelQuery = `
      SELECT 
        COALESCE(nv.nombre, 'Sin nivel') as nivel,
        COUNT(n.id)::int as cantidad
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
        COUNT(*)::int as cantidad
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
        COUNT(*)::int as cantidad
      FROM ninos
      WHERE activo = true
      GROUP BY rango_edad
      ORDER BY rango_edad
    `

    const porEdadResult = await pool.query(porEdadQuery)

    const totalNinos = ninosResult.rows.length

    console.log('✅ Total niños activos:', totalNinos)

    res.json({
      ninos: ninosResult.rows,
      resumen: {
        total_ninos: totalNinos,
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

// GET /ninos/export.csv - Exportar niños activos a CSV
r.get('/ninos/export.csv', verificarAcceso, async (req: any, res: any) => {
  try {
    console.log('📥 Exportando reporte niños activos CSV')

    const query = `
      SELECT 
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
    const headers = ['nombres', 'apellidos', 'fecha_nacimiento', 'edad', 'genero', 'nivel', 'subnivel', 'encargado', 'telefono', 'direccion']
    const escape = (s: any) => {
      const v = (s === null || s === undefined) ? '' : String(s)
      return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
    }

    const lines = [
      'Nombres,Apellidos,Fecha Nacimiento,Edad,Género,Nivel,Subnivel,Encargado,Teléfono,Dirección',
      ...rows.map(r => headers.map(h => escape((r as any)[h])).join(','))
    ]

    // Agregar resumen
    lines.push('')
    lines.push('RESUMEN,,,,,,,,,')
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

// GET /ninos-inactivos/export.csv - Exportar niños inactivos a CSV
r.get('/ninos-inactivos/export.csv', verificarAcceso, async (req: any, res: any) => {
  try {
    console.log('📥 Exportando reporte niños inactivos CSV')

    const query = `
      SELECT 
        n.nombres,
        n.apellidos,
        to_char(n.fecha_nacimiento, 'YYYY-MM-DD') as fecha_nacimiento,
        EXTRACT(YEAR FROM AGE(n.fecha_nacimiento))::int as edad,
        CASE WHEN n.genero = 'M' THEN 'Masculino' ELSE 'Femenino' END as genero,
        COALESCE(nv.nombre, 'Sin nivel') as nivel,
        COALESCE(sn.nombre, 'Sin subnivel') as subnivel,
        n.nombre_encargado as encargado,
        n.telefono_contacto as telefono,
        COALESCE(n.motivo_inactividad, 'No especificado') as motivo_inactividad,
        to_char(n.fecha_inactivacion, 'YYYY-MM-DD') as fecha_inactivacion
      FROM ninos n
      LEFT JOIN niveles nv ON n.nivel_id = nv.id
      LEFT JOIN subniveles sn ON n.subnivel_id = sn.id
      WHERE n.activo = false
      ORDER BY n.fecha_inactivacion DESC NULLS LAST, n.nombres ASC
    `

    const { rows } = await pool.query(query)

    // Armar CSV
    const headers = ['nombres', 'apellidos', 'fecha_nacimiento', 'edad', 'genero', 'nivel', 'subnivel', 'encargado', 'telefono', 'motivo_inactividad', 'fecha_inactivacion']
    const escape = (s: any) => {
      const v = (s === null || s === undefined) ? '' : String(s)
      return /[",\n\r]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v
    }

    const lines = [
      'Nombres,Apellidos,Fecha Nacimiento,Edad,Género,Nivel,Subnivel,Encargado,Teléfono,Motivo Inactividad,Fecha Inactivación',
      ...rows.map(r => headers.map(h => escape((r as any)[h])).join(','))
    ]

    // Agregar resumen
    lines.push('')
    lines.push('RESUMEN,,,,,,,,,,')
    lines.push(`Total Niños Inactivos,${rows.length},,,,,,,,,`)
    
    // Contar por motivo
    const porMotivo: any = {}
    rows.forEach((r: any) => {
      const motivo = r.motivo_inactividad || 'No especificado'
      porMotivo[motivo] = (porMotivo[motivo] || 0) + 1
    })
    
    lines.push('')
    lines.push('POR MOTIVO,,,,,,,,,,')
    Object.entries(porMotivo).forEach(([motivo, count]) => {
      lines.push(`${motivo},${count},,,,,,,,,,`)
    })

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