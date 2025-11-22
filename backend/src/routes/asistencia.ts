import { Router } from 'express'
import { authMiddleware } from '../core/auth_middleware'
import { pool } from '../core/db'

const r = Router()

// GET / - Listar registros de asistencia
r.get('/', authMiddleware, async (req: any, res: any) => {
  try {
    const userId = req.user?.id
    const { fecha } = req.query

    console.log('📋 GET /asistencia')
    console.log('Usuario:', req.user?.email)
    console.log('Filtro fecha:', fecha)

    const userQuery = await pool.query(
      'SELECT rol FROM usuarios WHERE id = $1',
      [userId]
    )
    const esDirectora = userQuery.rows[0]?.rol === 'directora'

    let query = `
      SELECT 
        a.id,
        a.sesion_id,
        a.fecha,
        a.hora,
        a.nota,
        a.estado,
        a.creado_en,
        u.nombres || ' ' || COALESCE(u.apellidos, '') as maestro_nombre,
        COUNT(DISTINCT CASE WHEN a.nino_id IS NOT NULL THEN a.nino_id END) as total_ninos
      FROM asistencia a
      LEFT JOIN usuarios u ON a.maestro_id = u.id
      WHERE 1=1
    `
    const params: any[] = []
    let paramIndex = 1

    if (!esDirectora) {
      query += ` AND a.maestro_id = $${paramIndex}`
      params.push(userId)
      paramIndex++
    }

    if (fecha) {
      query += ` AND a.fecha = $${paramIndex}`
      params.push(fecha)
      paramIndex++
    }

    query += ` GROUP BY a.id, a.sesion_id, a.fecha, a.hora, a.nota, a.estado, a.creado_en, u.nombres, u.apellidos`
    query += ` ORDER BY a.fecha DESC, a.hora DESC NULLS LAST, a.creado_en DESC`

    const { rows } = await pool.query(query, params)

    console.log('✅ Registros encontrados:', rows.length)
    res.json(rows)
  } catch (error: any) {
    console.error('❌ Error en GET /asistencia:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /:sesion_id/detalle - Obtener detalle de una sesión de asistencia
r.get('/:sesion_id/detalle', authMiddleware, async (req: any, res: any) => {
  try {
    const { sesion_id } = req.params
    const userId = req.user?.id

    console.log('📋 GET /asistencia/:sesion_id/detalle')
    console.log('Sesion ID:', sesion_id)

    const userQuery = await pool.query(
      'SELECT rol FROM usuarios WHERE id = $1',
      [userId]
    )
    const esDirectora = userQuery.rows[0]?.rol === 'directora'

    // Obtener información de la sesión
    let sesionQuery = `
      SELECT DISTINCT
        a.sesion_id,
        a.fecha,
        a.hora,
        a.nota,
        a.estado,
        u.nombres || ' ' || COALESCE(u.apellidos, '') as maestro_nombre
      FROM asistencia a
      LEFT JOIN usuarios u ON a.maestro_id = u.id
      WHERE a.sesion_id = $1
    `
    const sesionParams = [sesion_id]

    if (!esDirectora) {
      sesionQuery += ` AND a.maestro_id = $2`
      sesionParams.push(userId)
    }

    const sesionResult = await pool.query(sesionQuery, sesionParams)

    if (sesionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Sesión no encontrada' })
    }

    // Obtener niños de la sesión
    const ninosQuery = await pool.query(`
      SELECT 
        a.id as asistencia_id,
        a.nino_id,
        n.nombres,
        n.apellidos,
        n.codigo,
        nv.nombre as nivel_nombre,
        sn.nombre as subnivel_nombre
      FROM asistencia a
      LEFT JOIN ninos n ON a.nino_id = n.id
      LEFT JOIN niveles nv ON n.nivel_id = nv.id
      LEFT JOIN subniveles sn ON n.subnivel_id = sn.id
      WHERE a.sesion_id = $1 AND a.nino_id IS NOT NULL
      ORDER BY n.apellidos, n.nombres
    `, [sesion_id])

    console.log('✅ Sesión encontrada con', ninosQuery.rows.length, 'niños')

    res.json({
      sesion: sesionResult.rows[0],
      ninos: ninosQuery.rows
    })
  } catch (error: any) {
    console.error('❌ Error en GET /asistencia/:sesion_id/detalle:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST / - Crear registro de asistencia (sesión inicial)
r.post('/', authMiddleware, async (req: any, res: any) => {
  try {
    const { fecha, hora, notas } = req.body
    const userId = req.user?.id

    console.log('📝 POST /asistencia - Datos:', { fecha, hora, notas, userId })

    if (!fecha) {
      return res.status(400).json({ error: 'La fecha es requerida' })
    }

    // Crear sesión inicial con UUID y estado 'borrador' o 'pendiente'
    const { rows } = await pool.query(`
      INSERT INTO asistencia (
        sesion_id,
        maestro_id,
        usuario_id,
        fecha, 
        hora, 
        nota, 
        estado, 
        creado_en, 
        modificado_en
      )
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, 'borrador', NOW(), NOW())
      RETURNING *
    `, [
      userId,      // maestro_id
      userId,      // usuario_id
      fecha, 
      hora || null, 
      notas || null
    ])

    console.log('✅ Sesión de asistencia creada:', rows[0].sesion_id)
    res.json({ ok: true, asistencia: rows[0] })
  } catch (error: any) {
    console.error('❌ Error en POST /asistencia:', error.message)
    console.error('Detail:', error.detail)
    console.error('Constraint:', error.constraint)
    res.status(500).json({ error: error.message })
  }
})

// POST /:sesion_id/ninos - Agregar niños a la sesión de asistencia
r.post('/:sesion_id/ninos', authMiddleware, async (req: any, res: any) => {
  try {
    const { sesion_id } = req.params
    const { ninos } = req.body // Array de IDs de niños
    const userId = req.user?.id

    console.log('📝 POST /asistencia/:sesion_id/ninos')
    console.log('Sesion ID:', sesion_id)
    console.log('Niños a agregar:', ninos?.length)

    if (!Array.isArray(ninos) || ninos.length === 0) {
      return res.status(400).json({ error: 'Debe seleccionar al menos un niño' })
    }

    // Verificar que la sesión existe y pertenece al usuario
    const sesionCheck = await pool.query(
      'SELECT maestro_id, fecha, hora, nota FROM asistencia WHERE sesion_id = $1 LIMIT 1',
      [sesion_id]
    )

    if (sesionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Sesión no encontrada' })
    }

    if (sesionCheck.rows[0].maestro_id !== userId) {
      return res.status(403).json({ error: 'No tienes permiso para modificar esta sesión' })
    }

    const { fecha, hora, nota } = sesionCheck.rows[0]

    // Insertar un registro por cada niño
    const insertPromises = ninos.map(ninoId => 
      pool.query(`
        INSERT INTO asistencia (
          sesion_id,
          nino_id,
          maestro_id,
          usuario_id,
          fecha,
          hora,
          nota,
          estado,
          creado_en,
          modificado_en
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW(), NOW())
        ON CONFLICT (sesion_id, nino_id) DO NOTHING
      `, [sesion_id, ninoId, userId, userId, fecha, hora, nota, 'pendiente'])
    )

    await Promise.all(insertPromises)

    console.log('✅ Niños agregados a la sesión:', ninos.length)
    res.json({ ok: true, agregados: ninos.length })
  } catch (error: any) {
    console.error('❌ Error en POST /asistencia/:sesion_id/ninos:', error.message)
    res.status(500).json({ error: error.message })
  }
})

// PUT /:sesion_id - Actualizar sesión completa (marcar como completada)
r.put('/:sesion_id', authMiddleware, async (req: any, res: any) => {
  try {
    const { sesion_id } = req.params
    const { estado, nota } = req.body
    const userId = req.user?.id

    console.log('✏️ PUT /asistencia/:sesion_id')
    console.log('Sesion ID:', sesion_id)
    console.log('Estado:', estado)

    // Verificar que la sesión pertenece al usuario
    const sesionCheck = await pool.query(
      'SELECT maestro_id FROM asistencia WHERE sesion_id = $1 LIMIT 1',
      [sesion_id]
    )

    if (sesionCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Sesión no encontrada' })
    }

    if (sesionCheck.rows[0].maestro_id !== userId) {
      return res.status(403).json({ error: 'No tienes permiso para modificar esta sesión' })
    }

    // Actualizar todos los registros de la sesión
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    if (estado !== undefined) {
      updates.push(`estado = $${paramIndex}`)
      values.push(estado)
      paramIndex++
    }

    if (nota !== undefined) {
      updates.push(`nota = $${paramIndex}`)
      values.push(nota)
      paramIndex++
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' })
    }

    updates.push(`modificado_en = NOW()`)
    updates.push(`modificado_por = $${paramIndex}`)
    values.push(userId)
    paramIndex++

    values.push(sesion_id)

    await pool.query(
      `UPDATE asistencia SET ${updates.join(', ')} WHERE sesion_id = $${paramIndex}`,
      values
    )

    console.log('✅ Sesión actualizada')
    res.json({ ok: true })
  } catch (error: any) {
    console.error('❌ Error en PUT /asistencia/:sesion_id:', error.message)
    res.status(500).json({ error: error.message })
  }
})

// DELETE /:sesion_id - Eliminar sesión completa
r.delete('/:sesion_id', authMiddleware, async (req: any, res: any) => {
  try {
    const { sesion_id } = req.params
    const userId = req.user?.id

    console.log('🗑️ DELETE /asistencia/:sesion_id')
    console.log('Sesion ID:', sesion_id)

    // Verificar que la sesión pertenece al usuario o es directora
    const userQuery = await pool.query(
      'SELECT rol FROM usuarios WHERE id = $1',
      [userId]
    )
    const esDirectora = userQuery.rows[0]?.rol === 'directora'

    if (!esDirectora) {
      const sesionCheck = await pool.query(
        'SELECT maestro_id FROM asistencia WHERE sesion_id = $1 LIMIT 1',
        [sesion_id]
      )

      if (sesionCheck.rows.length === 0) {
        return res.status(404).json({ error: 'Sesión no encontrada' })
      }

      if (sesionCheck.rows[0].maestro_id !== userId) {
        return res.status(403).json({ error: 'No tienes permiso para eliminar esta sesión' })
      }
    }

    // Eliminar todos los registros de la sesión
    await pool.query('DELETE FROM asistencia WHERE sesion_id = $1', [sesion_id])

    console.log('✅ Sesión eliminada')
    res.json({ ok: true })
  } catch (error: any) {
    console.error('❌ Error en DELETE /asistencia/:sesion_id:', error.message)
    res.status(500).json({ error: error.message })
  }
})

export default r