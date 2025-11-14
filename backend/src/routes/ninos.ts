// src/routes/ninos.ts
import { Router } from 'express'
import { authMiddleware } from '../core/auth_middleware'
import { requirePerms } from '../core/perm_middleware'
import { pool } from '../core/db'

const router = Router()

// GET /ninos - Listar niños ACTIVOS
router.get('/', authMiddleware, async (req: any, res: any) => {
  try {
    const userId = req.user.id

    const userResult = await pool.query(
      'SELECT id, email, nombres, rol FROM usuarios WHERE id = $1',
      [userId]
    )

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado' })
    }

    const usuario = userResult.rows[0]
    const esDirectora = String(usuario.rol) === '1' || usuario.rol === 1

    let query = `
      SELECT 
        n.id,
        n.codigo,
        n.nombres,
        n.apellidos,
        n.fecha_nacimiento,
        n.maestro_id,
        n.nivel_id,
        n.subnivel_id,
        n.activo,
        n.genero,
        n.direccion,
        n.telefono_contacto,
        n.nombre_encargado,
        n.telefono_encargado,
        n.direccion_encargado,
        u.email as maestro_email,
        u.nombres || ' ' || COALESCE(u.apellidos, '') as maestro_nombre,
        nv.nombre as nivel_nombre,
        sn.nombre as subnivel_nombre,
        EXTRACT(YEAR FROM AGE(n.fecha_nacimiento))::int as edad
      FROM ninos n
      LEFT JOIN usuarios u ON n.maestro_id = u.id
      LEFT JOIN niveles nv ON n.nivel_id = nv.id
      LEFT JOIN subniveles sn ON n.subnivel_id = sn.id
      WHERE 1=1
    `
    const params: any[] = []

    if (!esDirectora) {
      params.push(userId)
      query += ` AND n.maestro_id = $1`
    }

    query += ' ORDER BY n.apellidos, n.nombres'

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error: any) {
    console.error('❌ ERROR:', error.message)
    res.status(500).json({ error: 'Error al listar niños' })
  }
})

// GET /ninos/lista-inactivos - Listar niños INACTIVOS
router.get('/lista-inactivos', authMiddleware, async (req: any, res: any) => {
  try {
    const userId = req.user.id

    console.log('\n📋 Listando niños inactivos')

    const userResult = await pool.query(
      'SELECT id, email, nombres, rol FROM usuarios WHERE id = $1',
      [userId]
    )

    const usuario = userResult.rows[0]
    const esDirectora = String(usuario.rol) === '1' || usuario.rol === 1

    let query = `
      SELECT 
        n.id,
        n.codigo,
        n.nombres,
        n.apellidos,
        n.fecha_nacimiento,
        n.maestro_id,
        n.nivel_id,
        n.motivo_inactividad,
        n.fecha_inactivacion,
        n.nombre_encargado,
        n.telefono_encargado,
        u.email as maestro_email,
        u.nombres || ' ' || COALESCE(u.apellidos, '') as maestro_nombre,
        nv.nombre as nivel_nombre,
        EXTRACT(YEAR FROM AGE(n.fecha_nacimiento))::int as edad
      FROM ninos_inactivos n
      LEFT JOIN usuarios u ON n.maestro_id = u.id
      LEFT JOIN niveles nv ON n.nivel_id = nv.id
      WHERE 1=1
    `
    const params: any[] = []

    if (!esDirectora) {
      params.push(userId)
      query += ` AND n.maestro_id = $1`
    }

    query += ' ORDER BY n.fecha_inactivacion DESC, n.apellidos, n.nombres'

    const result = await pool.query(query, params)

    console.log('✅ Inactivos encontrados:', result.rows.length)

    res.json(result.rows)
  } catch (error: any) {
    console.error('❌ ERROR:', error.message)
    res.status(500).json({ error: 'Error al listar inactivos' })
  }
})

// POST /ninos/:id/inactivar-manual - Mover a tabla inactivos
router.post('/:id/inactivar-manual', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params
    const { motivo } = req.body

    console.log('\n🚪 Inactivando niño (manual)')
    console.log('   ID:', id)
    console.log('   Motivo:', motivo)

    if (!motivo || !motivo.trim()) {
      return res.status(400).json({ error: 'El motivo es requerido' })
    }

    // 1. Obtener datos del niño
    const ninoResult = await pool.query('SELECT * FROM ninos WHERE id = $1', [id])
    
    if (ninoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Niño no encontrado' })
    }

    const nino = ninoResult.rows[0]

    // 2. Insertar en ninos_inactivos
    await pool.query(
      `INSERT INTO ninos_inactivos 
        (id, codigo, nombres, apellidos, fecha_nacimiento, maestro_id, 
         nivel_id, subnivel_id, genero, direccion, telefono_contacto,
         nombre_encargado, telefono_encargado, direccion_encargado,
         motivo_inactividad, fecha_inactivacion, creado_en)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), $16)`,
      [
        nino.id, nino.codigo, nino.nombres, nino.apellidos, nino.fecha_nacimiento,
        nino.maestro_id, nino.nivel_id, nino.subnivel_id, nino.genero, 
        nino.direccion, nino.telefono_contacto, nino.nombre_encargado,
        nino.telefono_encargado, nino.direccion_encargado, motivo.trim(), nino.creado_en
      ]
    )

    // 3. Eliminar de ninos
    await pool.query('DELETE FROM ninos WHERE id = $1', [id])

    console.log('✅ Niño movido a inactivos:', nino.nombres, nino.apellidos)

    res.json({ 
      ok: true, 
      message: 'Niño inactivado exitosamente',
      nino: { nombres: nino.nombres, apellidos: nino.apellidos }
    })

  } catch (error: any) {
    console.error('❌ ERROR:', error.message)
    res.status(500).json({ error: 'Error al inactivar: ' + error.message })
  }
})

// POST /ninos/:id/reactivar-manual - Mover de inactivos a activos
router.post('/:id/reactivar-manual', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params

    console.log('\n✅ Reactivando niño (manual)')
    console.log('   ID:', id)

    // 1. Obtener datos del niño inactivo
    const ninoResult = await pool.query('SELECT * FROM ninos_inactivos WHERE id = $1', [id])
    
    if (ninoResult.rows.length === 0) {
      return res.status(404).json({ error: 'Niño no encontrado en inactivos' })
    }

    const nino = ninoResult.rows[0]

    // 2. Insertar de vuelta en ninos
    await pool.query(
      `INSERT INTO ninos 
        (id, codigo, nombres, apellidos, fecha_nacimiento, maestro_id, 
         nivel_id, subnivel_id, activo, genero, direccion, telefono_contacto,
         nombre_encargado, telefono_encargado, direccion_encargado, creado_en)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, true, $9, $10, $11, $12, $13, $14, $15)`,
      [
        nino.id, nino.codigo, nino.nombres, nino.apellidos, nino.fecha_nacimiento,
        nino.maestro_id, nino.nivel_id, nino.subnivel_id, nino.genero,
        nino.direccion, nino.telefono_contacto, nino.nombre_encargado,
        nino.telefono_encargado, nino.direccion_encargado, nino.creado_en
      ]
    )

    // 3. Eliminar de ninos_inactivos
    await pool.query('DELETE FROM ninos_inactivos WHERE id = $1', [id])

    console.log('✅ Niño reactivado:', nino.nombres, nino.apellidos)

    res.json({ 
      ok: true, 
      message: 'Niño reactivado exitosamente',
      nino: { nombres: nino.nombres, apellidos: nino.apellidos }
    })

  } catch (error: any) {
    console.error('❌ ERROR:', error.message)
    res.status(500).json({ error: 'Error al reactivar: ' + error.message })
  }
})

// POST /ninos - Crear niño
router.post('/', authMiddleware, requirePerms(['ninos_crear']), async (req: any, res: any) => {
  try {
    const { 
      nombres, apellidos, fecha_nacimiento, nivel_id, subnivel_id, maestro_id,
      codigo, genero, direccion, telefono_contacto,
      nombre_encargado, telefono_encargado, direccion_encargado 
    } = req.body

    if (!nombres || !apellidos || !fecha_nacimiento || !maestro_id || !codigo) {
      return res.status(400).json({ 
        error: 'Faltan campos requeridos: nombres, apellidos, fecha_nacimiento, maestro_id y código' 
      })
    }

    if (!codigo.trim()) {
      return res.status(400).json({ 
        error: 'El código del niño es obligatorio y no puede estar vacío' 
      })
    }

    if (telefono_encargado) {
      const telefonoLimpio = telefono_encargado.replace(/\s/g, '')
      
      if (!/^\d+$/.test(telefonoLimpio)) {
        return res.status(400).json({ 
          error: 'El teléfono del encargado solo debe contener números' 
        })
      }
      
      if (telefonoLimpio.length !== 8) {
        return res.status(400).json({ 
          error: 'El teléfono del encargado debe tener exactamente 8 dígitos' 
        })
      }
    }

    const maestroCheck = await pool.query(
      'SELECT id, email FROM usuarios WHERE id = $1',
      [maestro_id]
    )

    if (maestroCheck.rows.length === 0) {
      return res.status(400).json({ error: 'El maestro seleccionado no existe' })
    }

    const codigoCheck = await pool.query(
      'SELECT id, nombres, apellidos FROM ninos WHERE LOWER(codigo) = LOWER($1)',
      [codigo.trim()]
    )

    if (codigoCheck.rows.length > 0) {
      return res.status(400).json({ 
        error: `El código "${codigo}" ya está en uso por ${codigoCheck.rows[0].nombres} ${codigoCheck.rows[0].apellidos}` 
      })
    }

    const result = await pool.query(
      `INSERT INTO ninos 
        (nombres, apellidos, fecha_nacimiento, nivel_id, subnivel_id, maestro_id, 
         activo, codigo, genero, direccion, telefono_contacto,
         nombre_encargado, telefono_encargado, direccion_encargado, creado_en)
      VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8, $9, $10, $11, $12, $13, NOW())
      RETURNING *`,
      [
        nombres.trim(), apellidos.trim(), fecha_nacimiento, 
        nivel_id || null, subnivel_id || null, maestro_id,
        codigo.trim(), genero || null, direccion || null, telefono_contacto || null,
        nombre_encargado || null, 
        telefono_encargado ? telefono_encargado.replace(/\s/g, '') : null,
        direccion_encargado || null
      ]
    )

    res.json({ ok: true, nino: result.rows[0] })
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    res.status(500).json({ error: error.message })
  }
})

// GET /ninos/:id - Ver un niño específico
router.get('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    const userResult = await pool.query(
      'SELECT rol FROM usuarios WHERE id = $1',
      [userId]
    )

    const esDirectora = String(userResult.rows[0]?.rol) === '1' || userResult.rows[0]?.rol === 1

    let query = `
      SELECT 
        n.*,
        u.nombres || ' ' || COALESCE(u.apellidos, '') as maestro_nombre,
        nv.nombre as nivel_nombre,
        sn.nombre as subnivel_nombre,
        EXTRACT(YEAR FROM AGE(n.fecha_nacimiento))::int as edad
      FROM ninos n
      LEFT JOIN usuarios u ON n.maestro_id = u.id
      LEFT JOIN niveles nv ON n.nivel_id = nv.id
      LEFT JOIN subniveles sn ON n.subnivel_id = sn.id
      WHERE n.id = $1
    `
    const params: any[] = [id]

    if (!esDirectora) {
      params.push(userId)
      query += ` AND n.maestro_id = $2`
    }

    const result = await pool.query(query, params)

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Niño no encontrado o sin acceso' })
    }

    res.json(result.rows[0])
  } catch (error: any) {
    console.error('Error:', error)
    res.status(500).json({ error: 'Error al obtener niño' })
  }
})

// PUT /ninos/:id - Actualizar niño
router.put('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const body = req.body

    const userResult = await pool.query(
      'SELECT rol FROM usuarios WHERE id = $1',
      [userId]
    )

    if (userResult.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado' })
    }

    const esDirectora = String(userResult.rows[0]?.rol) === '1' || userResult.rows[0]?.rol === 1

    if (!esDirectora) {
      const check = await pool.query(
        'SELECT id FROM ninos WHERE id = $1 AND maestro_id = $2',
        [id, userId]
      )

      if (check.rows.length === 0) {
        return res.status(403).json({ error: 'No tienes acceso a este niño' })
      }
    }

    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    const allowedFields = [
      'nombres', 'apellidos', 'fecha_nacimiento', 'nivel_id', 'subnivel_id',
      'maestro_id', 'codigo', 'genero', 'direccion', 'telefono_contacto',
      'nombre_encargado', 'telefono_encargado', 'direccion_encargado'
    ]

    allowedFields.forEach(field => {
      if (field in body) {
        updates.push(`${field} = $${paramIndex}`)
        
        const value = body[field]
        if (value === null || value === undefined) {
          values.push(null)
        } else if (typeof value === 'string') {
          values.push(value.trim())
        } else {
          values.push(value)
        }
        paramIndex++
      }
    })

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' })
    }

    updates.push(`modificado_en = NOW()`)
    values.push(id)

    const query = `UPDATE ninos SET ${updates.join(', ')} WHERE id = $${paramIndex} RETURNING *`

    const result = await pool.query(query, values)

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Niño no encontrado' })
    }

    res.json({ ok: true, nino: result.rows[0] })
  } catch (error: any) {
    console.error('❌ Error:', error.message)
    res.status(500).json({ error: error.message })
  }
})

// DELETE /ninos/:id - Eliminar niño
router.delete('/:id', authMiddleware, requirePerms(['ninos_eliminar']), async (req: any, res: any) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    const userResult = await pool.query(
      'SELECT rol FROM usuarios WHERE id = $1',
      [userId]
    )

    const esDirectora = String(userResult.rows[0]?.rol) === '1' || userResult.rows[0]?.rol === 1

    let checkQuery = 'SELECT id FROM ninos WHERE id = $1'
    const checkParams: any[] = [id]

    if (!esDirectora) {
      checkParams.push(userId)
      checkQuery += ' AND maestro_id = $2'
    }

    const check = await pool.query(checkQuery, checkParams)

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Niño no encontrado o sin acceso' })
    }

    await pool.query('DELETE FROM asistencia WHERE nino_id = $1', [id])
    await pool.query('DELETE FROM ninos WHERE id = $1', [id])

    res.json({ ok: true })
  } catch (error: any) {
    console.error('Error:', error.message)
    res.status(500).json({ error: error.message })
  }
})

export default router