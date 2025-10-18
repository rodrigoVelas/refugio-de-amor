import { Router } from 'express'
import { pool } from '../core/db'

const r = Router()

// listar con busqueda simple por q (solo codigo, nombres, apellidos)
// Modificado para excluir registros eliminados lógicamente
r.get('/ninos', async (req: any, res) => {
  const q = (req.query.q || '').toString().trim()
  const incluirInactivos = req.query.incluirInactivos === 'true'
  
  const params: any[] = []
  let where = incluirInactivos ? '' : 'where (activo = true OR activo IS NULL)'
  
  if (q) {
    params.push(`%${q.toLowerCase()}%`)
    where = incluirInactivos 
      ? `where lower(nombres) like $1 or lower(apellidos) like $1 or lower(codigo) like $1`
      : `where (activo = true OR activo IS NULL) and (lower(nombres) like $1 or lower(apellidos) like $1 or lower(codigo) like $1)`
  }
  
  const sql = `
    select
      id, codigo, nombres, apellidos, fecha_nacimiento,
      nivel_id, subnivel_id, maestro_id,
      nombre_encargado, telefono_encargado, direccion_encargado,
      activo, fecha_baja,
      creado_en, modificado_en
    from ninos
    ${where}
    order by apellidos asc, nombres asc
    limit 1000
  `
  
  try {
    const { rows } = await pool.query(sql, params)
    res.json(rows)
  } catch (error: any) {
    console.error('Error al listar niños:', error)
    res.status(500).json({ 
      error: 'Error al obtener la lista de niños',
      message: error.message 
    })
  }
})

// obtener uno
r.get('/ninos/:id', async (req, res) => {
  const { id } = req.params
  
  try {
    const { rows } = await pool.query(
      `select
        id, codigo, nombres, apellidos, fecha_nacimiento,
        nivel_id, subnivel_id, maestro_id,
        nombre_encargado, telefono_encargado, direccion_encargado,
        activo, fecha_baja,
        creado_en, modificado_en
      from ninos where id=$1`,
      [id]
    )
    
    if (!rows[0]) {
      return res.status(404).json({ error: 'Niño no encontrado' })
    }
    
    res.json(rows[0])
  } catch (error: any) {
    console.error('Error al obtener niño:', error)
    res.status(500).json({ 
      error: 'Error al obtener el registro',
      message: error.message 
    })
  }
})

// crear
r.post('/ninos', async (req: any, res) => {
  const b = req.body || {}
  
  // Validaciones
  if (!b.nombres || !b.apellidos) {
    return res.status(400).json({ error: 'Nombres y apellidos son requeridos' })
  }
  
  const codigo = (b.codigo || '').toString().trim()
  if (!codigo) {
    return res.status(400).json({ error: 'Código es requerido' })
  }
  
  const sql = `
    insert into ninos (
      codigo, nombres, apellidos, fecha_nacimiento,
      nivel_id, subnivel_id, maestro_id,
      nombre_encargado, telefono_encargado, direccion_encargado,
      activo, creado_en, modificado_en
    ) values (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10, true, now(), now()
    )
    returning
      id, codigo, nombres, apellidos, fecha_nacimiento,
      nivel_id, subnivel_id, maestro_id,
      nombre_encargado, telefono_encargado, direccion_encargado,
      activo, fecha_baja,
      creado_en, modificado_en
  `
  
  const params = [
    codigo,
    b.nombres?.trim(),
    b.apellidos?.trim(),
    b.fecha_nacimiento || null,
    b.nivel_id || null,
    b.subnivel_id || null,
    b.maestro_id || null,
    (b.nombre_encargado || '').trim(),
    (b.telefono_encargado || '').trim(),
    (b.direccion_encargado || '').trim(),
  ]
  
  try {
    const { rows } = await pool.query(sql, params)
    res.json(rows[0])
  } catch(e: any) {
    if (e.code === '23505') {
      return res.status(409).json({ error: 'El código ya existe' })
    }
    console.error('Error al crear niño:', e)
    res.status(500).json({ 
      error: 'Error al crear el registro',
      message: e.message 
    })
  }
})

// actualizar
r.put('/ninos/:id', async (req, res) => {
  const { id } = req.params
  const b = req.body || {}
  
  const codigo = (b.codigo || '').toString().trim()
  if (!codigo) {
    return res.status(400).json({ error: 'Código es requerido' })
  }
  
  const sql = `
    update ninos set
      codigo = $1,
      nombres = $2,
      apellidos = $3,
      fecha_nacimiento = $4,
      nivel_id = $5,
      subnivel_id = $6,
      maestro_id = $7,
      nombre_encargado = $8,
      telefono_encargado = $9,
      direccion_encargado = $10,
      modificado_en = now()
    where id = $11
    returning
      id, codigo, nombres, apellidos, fecha_nacimiento,
      nivel_id, subnivel_id, maestro_id,
      nombre_encargado, telefono_encargado, direccion_encargado,
      activo, fecha_baja,
      creado_en, modificado_en
  `
  
  const params = [
    codigo,
    b.nombres?.trim(),
    b.apellidos?.trim(),
    b.fecha_nacimiento || null,
    b.nivel_id || null,
    b.subnivel_id || null,
    b.maestro_id || null,
    (b.nombre_encargado || '').trim(),
    (b.telefono_encargado || '').trim(),
    (b.direccion_encargado || '').trim(),
    id
  ]
  
  try {
    const { rows } = await pool.query(sql, params)
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Registro no encontrado' })
    }
    res.json(rows[0])
  } catch(e: any) {
    if (e.code === '23505') {
      return res.status(409).json({ error: 'El código ya existe' })
    }
    console.error('Error al actualizar niño:', e)
    res.status(500).json({ 
      error: 'Error al actualizar el registro',
      message: e.message 
    })
  }
})

// ELIMINAR FÍSICO - Con manejo de errores mejorado
r.delete('/ninos/:id', async (req, res) => {
  const { id } = req.params
  const { forzar } = req.query // ?forzar=true para eliminar en cascada
  
  const client = await pool.connect()
  
  try {
    await client.query('BEGIN')
    
    // Verificar si el registro existe
    const checkResult = await client.query(
      'SELECT id FROM ninos WHERE id = $1',
      [id]
    )
    
    if (checkResult.rows.length === 0) {
      await client.query('ROLLBACK')
      return res.status(404).json({ 
        error: 'Registro no encontrado' 
      })
    }
    
    // Si se especifica forzar=true, eliminar registros relacionados primero
    if (forzar === 'true') {
      // Eliminar registros relacionados (ajusta según tus tablas)
      await client.query('DELETE FROM asistencia WHERE nino_id = $1', [id])
      await client.query('DELETE FROM documentos WHERE nino_id = $1', [id])
      await client.query('DELETE FROM facturas WHERE nino_id = $1', [id])
      // Agrega más tablas relacionadas según tu esquema
    }
    
    // Intentar eliminar el niño
    await client.query('DELETE FROM ninos WHERE id = $1', [id])
    
    await client.query('COMMIT')
    res.json({ 
      ok: true, 
      message: 'Registro eliminado correctamente' 
    })
    
  } catch (error: any) {
    await client.query('ROLLBACK')
    
    // Error de clave foránea
    if (error.code === '23503') {
      console.error('Error de clave foránea:', error.detail)
      return res.status(409).json({ 
        error: 'No se puede eliminar el registro',
        message: 'Existen registros relacionados que dependen de este niño. Debe eliminar primero los registros de asistencia, documentos, facturas, etc.',
        detail: error.detail,
        hint: 'Use el parámetro ?forzar=true para eliminar en cascada, o use la eliminación lógica'
      })
    }
    
    console.error('Error al eliminar niño:', error)
    res.status(500).json({ 
      error: 'Error al eliminar el registro',
      message: error.message 
    })
  } finally {
    client.release()
  }
})

// ELIMINAR LÓGICO (Soft Delete) - RECOMENDADO
r.put('/ninos/:id/desactivar', async (req, res) => {
  const { id } = req.params
  
  try {
    const sql = `
      UPDATE ninos 
      SET 
        activo = false,
        fecha_baja = CURRENT_TIMESTAMP,
        modificado_en = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING 
        id, codigo, nombres, apellidos, 
        activo, fecha_baja, modificado_en
    `
    
    const { rows } = await pool.query(sql, [id])
    
    if (rows.length === 0) {
      return res.status(404).json({ 
        error: 'Registro no encontrado' 
      })
    }
    
    res.json({ 
      ok: true,
      message: 'Registro desactivado correctamente',
      data: rows[0]
    })
  } catch (error: any) {
    console.error('Error al desactivar niño:', error)
    res.status(500).json({ 
      error: 'Error al desactivar el registro',
      message: error.message 
    })
  }
})

// REACTIVAR (para registros con soft delete)
r.put('/ninos/:id/reactivar', async (req, res) => {
  const { id } = req.params
  
  try {
    const sql = `
      UPDATE ninos 
      SET 
        activo = true,
        fecha_baja = NULL,
        modificado_en = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING 
        id, codigo, nombres, apellidos, 
        activo, fecha_baja, modificado_en
    `
    
    const { rows } = await pool.query(sql, [id])
    
    if (rows.length === 0) {
      return res.status(404).json({ 
        error: 'Registro no encontrado' 
      })
    }
    
    res.json({ 
      ok: true,
      message: 'Registro reactivado correctamente',
      data: rows[0]
    })
  } catch (error: any) {
    console.error('Error al reactivar niño:', error)
    res.status(500).json({ 
      error: 'Error al reactivar el registro',
      message: error.message 
    })
  }
})

// Verificar dependencias antes de eliminar
r.get('/ninos/:id/dependencias', async (req, res) => {
  const { id } = req.params
  
  try {
    const queries = [
      { tabla: 'asistencia', query: 'SELECT COUNT(*) as count FROM asistencia WHERE nino_id = $1' },
      { tabla: 'documentos', query: 'SELECT COUNT(*) as count FROM documentos WHERE nino_id = $1' },
      { tabla: 'facturas', query: 'SELECT COUNT(*) as count FROM facturas WHERE nino_id = $1' },
      // Agrega más tablas según tu esquema
    ]
    
    const dependencias: any = {}
    let totalDependencias = 0
    
    for (const { tabla, query } of queries) {
      try {
        const result = await pool.query(query, [id])
        const count = parseInt(result.rows[0]?.count || 0)
        dependencias[tabla] = count
        totalDependencias += count
      } catch (e) {
        // Si la tabla no existe, continuar
        dependencias[tabla] = 0
      }
    }
    
    res.json({
      tieneDependencias: totalDependencias > 0,
      total: totalDependencias,
      detalle: dependencias
    })
  } catch (error: any) {
    console.error('Error al verificar dependencias:', error)
    res.status(500).json({ 
      error: 'Error al verificar dependencias',
      message: error.message 
    })
  }
})

export default r