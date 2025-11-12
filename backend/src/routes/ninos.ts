// src/routes/ninos.ts
import { Router } from 'express'
import { authMiddleware } from '../core/auth_middleware'
import { requirePerms } from '../core/perm_middleware'
import { pool } from '../core/db'
import { getUserPerms } from '../core/rbac'

const router = Router()

// GET /ninos - Listar niños
router.get('/', authMiddleware, async (req: any, res: any) => {
  try {
    const userId = req.user.id

    console.log('\n' + '='.repeat(70))
    console.log('GET /ninos - DIAGNÓSTICO COMPLETO')
    console.log('='.repeat(70))
    console.log('1. Usuario ID:', userId)

    const userResult = await pool.query(
      'SELECT id, email, nombres, rol FROM usuarios WHERE id = $1',
      [userId]
    )

    if (userResult.rows.length === 0) {
      console.log('❌ ERROR: Usuario no encontrado')
      return res.status(401).json({ error: 'Usuario no encontrado' })
    }

    const usuario = userResult.rows[0]
    console.log('2. Usuario encontrado:')
    console.log('   - Email:', usuario.email)
    console.log('   - Nombres:', usuario.nombres)
    console.log('   - rol:', usuario.rol, '(tipo:', typeof usuario.rol, ')')

    const esDirectora = String(usuario.rol) === '1' || usuario.rol === 1
    console.log('3. ¿Es directora?:', esDirectora)

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
        n.motivo_inactividad,
        n.fecha_inactivacion,
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
      console.log('4. 🔒 FILTRO APLICADO: maestro_id = $1')
    } else {
      console.log('4. 👑 SIN FILTRO: Es directora, verá todos los niños')
    }

    const buscar = req.query.buscar
    if (buscar) {
      const searchIndex = params.length + 1
      params.push(`%${buscar}%`)
      query += ` AND (
        n.nombres ILIKE $${searchIndex} OR 
        n.apellidos ILIKE $${searchIndex} OR 
        n.codigo ILIKE $${searchIndex}
      )`
      console.log('   - Con búsqueda:', buscar)
    }

    query += ' ORDER BY n.activo DESC, n.apellidos, n.nombres'

    const result = await pool.query(query, params)

    console.log('\n7. ✅ Resultado:')
    console.log('   - Niños encontrados:', result.rows.length)
    console.log('   - Activos:', result.rows.filter(n => n.activo).length)
    console.log('   - Inactivos:', result.rows.filter(n => !n.activo).length)
    console.log('='.repeat(70) + '\n')

    res.json(result.rows)
  } catch (error: any) {
    console.error('❌ ERROR:', error.message)
    res.status(500).json({ error: 'Error al listar niños' })
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

// POST /ninos - Crear niño
router.post('/', authMiddleware, requirePerms(['ninos_crear']), async (req: any, res: any) => {
  try {
    const { 
      nombres, 
      apellidos, 
      fecha_nacimiento, 
      nivel_id, 
      subnivel_id, 
      maestro_id,
      codigo, 
      genero,
      direccion,
      telefono_contacto,
      nombre_encargado, 
      telefono_encargado, 
      direccion_encargado 
    } = req.body

    console.log('\n=== POST /ninos ===')
    console.log('Datos recibidos:')
    console.log('  - nombres:', nombres)
    console.log('  - apellidos:', apellidos)
    console.log('  - maestro_id:', maestro_id)

    if (!nombres || !apellidos || !fecha_nacimiento || !maestro_id) {
      console.log('❌ Faltan campos requeridos')
      return res.status(400).json({ 
        error: 'Faltan campos requeridos: nombres, apellidos, fecha_nacimiento, maestro_id' 
      })
    }

    const maestroCheck = await pool.query(
      'SELECT id, email FROM usuarios WHERE id = $1',
      [maestro_id]
    )

    if (maestroCheck.rows.length === 0) {
      console.log('❌ Maestro no existe:', maestro_id)
      return res.status(400).json({ error: 'El maestro seleccionado no existe' })
    }

    console.log('✅ Maestro verificado:', maestroCheck.rows[0].email)

    const result = await pool.query(
      `INSERT INTO ninos 
        (nombres, apellidos, fecha_nacimiento, nivel_id, subnivel_id, maestro_id, 
         activo, codigo, genero, direccion, telefono_contacto,
         nombre_encargado, telefono_encargado, direccion_encargado, creado_en)
      VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8, $9, $10, $11, $12, $13, NOW())
      RETURNING *`,
      [
        nombres, 
        apellidos, 
        fecha_nacimiento, 
        nivel_id || null, 
        subnivel_id || null, 
        maestro_id,
        codigo || null,
        genero || null,
        direccion || null,
        telefono_contacto || null,
        nombre_encargado || null, 
        telefono_encargado || null, 
        direccion_encargado || null
      ]
    )

    console.log('✅ Niño creado exitosamente:')
    console.log('   - ID:', result.rows[0].id)
    console.log('===================\n')

    res.json({ ok: true, nino: result.rows[0] })
  } catch (error: any) {
    console.error('❌ Error al crear niño:', error.message)
    res.status(500).json({ error: error.message })
  }
})

// PUT /ninos/:id - Actualizar niño
router.put('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const body = req.body

    console.log('\n=== PUT /ninos/:id ===')
    console.log('Actualizando niño:', id)

    const userResult = await pool.query(
      'SELECT rol FROM usuarios WHERE id = $1',
      [userId]
    )

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
      'nombre_encargado', 'telefono_encargado', 'direccion_encargado',
      'activo', 'motivo_inactividad', 'fecha_inactivacion'
    ]

    for (const field of allowedFields) {
      if (field in body) {
        updates.push(`${field} = $${paramIndex}`)
        values.push(body[field])
        paramIndex++
      }
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No hay campos para actualizar' })
    }

    updates.push(`modificado_en = NOW()`)
    values.push(id)

    const query = `
      UPDATE ninos
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `

    const result = await pool.query(query, values)

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Niño no encontrado' })
    }

    console.log('✅ Niño actualizado:', result.rows[0].nombres)

    res.json({ ok: true, nino: result.rows[0] })
  } catch (error: any) {
    console.error('❌ Error:', error)
    res.status(500).json({ error: 'Error al actualizar niño: ' + error.message })
  }
})

// POST /ninos/:id/inactivar - Inactivar un niño
// POST /ninos/:id/inactivar - Inactivar un niño (VERSIÓN SIMPLE)
router.post('/:id/inactivar', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params
    const { motivo } = req.body

    console.log('\n🚪 Inactivando niño')
    console.log('   ID:', id)
    console.log('   Motivo:', motivo)

    if (!motivo || !motivo.trim()) {
      return res.status(400).json({ error: 'El motivo es requerido' })
    }

    // Obtener datos del niño
    const ninoResult = await pool.query(
      'SELECT * FROM ninos WHERE id = $1',
      [id]
    )

    if (ninoResult.rows.length === 0) {
      console.log('❌ Niño no encontrado')
      return res.status(404).json({ error: 'Niño no encontrado' })
    }

    const nino = ninoResult.rows[0]
    console.log('   Niño:', nino.nombres, nino.apellidos)

    if (!nino.activo) {
      return res.status(400).json({ error: 'El niño ya está inactivo' })
    }

    // Insertar en tabla ninos_inactivos
    console.log('   Insertando en ninos_inactivos...')
    const insertResult = await pool.query(
      `INSERT INTO ninos_inactivos 
        (nino_id, nombres, apellidos, fecha_nacimiento, codigo, nivel_id, maestro_id,
         nombre_encargado, telefono_encargado, direccion_encargado, motivo_inactividad)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        nino.id,
        nino.nombres,
        nino.apellidos,
        nino.fecha_nacimiento,
        nino.codigo,
        nino.nivel_id,
        nino.maestro_id,
        nino.nombre_encargado,
        nino.telefono_encargado,
        nino.direccion_encargado,
        motivo.trim()
      ]
    )

    console.log('   ✅ Insertado ID:', insertResult.rows[0].id)

    // Marcar como inactivo en tabla ninos
    console.log('   Actualizando tabla ninos...')
    await pool.query(
      `UPDATE ninos 
       SET activo = false, 
           motivo_inactividad = $1, 
           fecha_inactivacion = NOW()
       WHERE id = $2`,
      [motivo.trim(), id]
    )

    console.log('✅ Niño inactivado exitosamente')

    res.json({ 
      ok: true, 
      message: 'Niño inactivado exitosamente'
    })

  } catch (error: any) {
    console.error('❌ ERROR COMPLETO:', error)
    console.error('   Mensaje:', error.message)
    console.error('   Stack:', error.stack)
    console.error('   Detail:', error.detail)
    
    res.status(500).json({ 
      error: 'Error del servidor',
      detalle: error.message 
    })
  }
})

// POST /ninos/:id/reactivar - Reactivar un niño
// POST /ninos/:id/reactivar - Reactivar un niño
router.post('/:id/reactivar', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params
    const userId = req.user?.id

    console.log('\n✅ POST /ninos/:id/reactivar')
    console.log('   ID del niño:', id)
    console.log('   Usuario:', userId)

    if (!userId) {
      return res.status(401).json({ error: 'No autenticado' })
    }

    // Verificar que el niño existe
    const check = await pool.query(
      'SELECT id, nombres, apellidos, activo FROM ninos WHERE id = $1',
      [id]
    )

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Niño no encontrado' })
    }

    if (check.rows[0].activo) {
      return res.status(400).json({ error: 'El niño ya está activo' })
    }

    // Iniciar transacción
    await pool.query('BEGIN')

    try {
      // 1. Eliminar de ninos_inactivos
      await pool.query('DELETE FROM ninos_inactivos WHERE nino_id = $1', [id])
      console.log('   ✅ Eliminado de ninos_inactivos')

      // 2. Reactivar en tabla ninos
      const result = await pool.query(
        `UPDATE ninos 
         SET activo = true, 
             motivo_inactividad = NULL, 
             fecha_inactivacion = NULL,
             modificado_en = NOW()
         WHERE id = $1
         RETURNING *`,
        [id]
      )

      console.log('   ✅ Reactivado en tabla ninos')

      // Confirmar transacción
      await pool.query('COMMIT')

      console.log('✅ Niño reactivado exitosamente')

      res.json({ 
        ok: true, 
        message: 'Niño reactivado exitosamente',
        nino: result.rows[0]
      })
    } catch (error) {
      await pool.query('ROLLBACK')
      throw error
    }
  } catch (error: any) {
    console.error('❌ Error al reactivar niño:', error.message)
    res.status(500).json({ error: 'Error al reactivar niño: ' + error.message })
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
    console.error('Error al eliminar:', error.message)
    res.status(500).json({ error: error.message })
  }
})

export default router