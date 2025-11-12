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

    // Obtener info del usuario (usando 'rol' no 'rol_id')
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

    // Determinar si es directora (rol = '1' o rol = 1)
    const esDirectora = String(usuario.rol) === '1' || usuario.rol === 1
    console.log('3. ¿Es directora?:', esDirectora)
    console.log('   - Comparación: rol', usuario.rol, '=== "1" o === 1?')

    // Construir query - IMPORTANTE: Ya NO filtramos por activo aquí
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
      console.log('   - userId que se usará:', userId)
    } else {
      console.log('4. 👑 SIN FILTRO: Es directora, verá todos los niños')
    }

    // Filtro de búsqueda
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

    console.log('\n5. Query SQL completa:')
    console.log(query)
    console.log('\n6. Parámetros:', params)

    // Ejecutar query
    const result = await pool.query(query, params)

    console.log('\n7. ✅ Resultado:')
    console.log('   - Niños encontrados:', result.rows.length)
    console.log('   - Activos:', result.rows.filter(n => n.activo).length)
    console.log('   - Inactivos:', result.rows.filter(n => !n.activo).length)
    
    if (result.rows.length > 0) {
      console.log('\n8. Primeros 3 niños:')
      result.rows.slice(0, 3).forEach((nino, i) => {
        console.log(`   ${i + 1}. ${nino.nombres} ${nino.apellidos}`)
        console.log(`      - maestro_id: ${nino.maestro_id}`)
        console.log(`      - maestro_email: ${nino.maestro_email}`)
        console.log(`      - activo: ${nino.activo}`)
      })
    } else {
      console.log('   ⚠️ No se encontraron niños con este filtro')
    }

    console.log('='.repeat(70) + '\n')

    res.json(result.rows)
  } catch (error: any) {
    console.error('❌ ERROR:', error.message)
    console.error('Stack:', error.stack)
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
    console.log('  - nivel_id:', nivel_id)
    console.log('  - subnivel_id:', subnivel_id)

    if (!nombres || !apellidos || !fecha_nacimiento || !maestro_id) {
      console.log('❌ Faltan campos requeridos')
      return res.status(400).json({ 
        error: 'Faltan campos requeridos: nombres, apellidos, fecha_nacimiento, maestro_id' 
      })
    }

    // Verificar que el maestro existe
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
    console.log('   - maestro_id guardado:', result.rows[0].maestro_id)
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
    console.log('Body recibido:', body)

    const userResult = await pool.query(
      'SELECT rol FROM usuarios WHERE id = $1',
      [userId]
    )

    const esDirectora = String(userResult.rows[0]?.rol) === '1' || userResult.rows[0]?.rol === 1

    // Si NO es directora, verificar acceso
    if (!esDirectora) {
      const check = await pool.query(
        'SELECT id FROM ninos WHERE id = $1 AND maestro_id = $2',
        [id, userId]
      )

      if (check.rows.length === 0) {
        return res.status(403).json({ error: 'No tienes acceso a este niño' })
      }
    }

    // Construir UPDATE dinámico
    const updates: string[] = []
    const values: any[] = []
    let paramIndex = 1

    // Campos que se pueden actualizar
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

    // Agregar modificado_en
    updates.push(`modificado_en = NOW()`)
    values.push(id)

    const query = `
      UPDATE ninos
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `

    console.log('Query:', query)
    console.log('Values:', values)

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
router.post('/:id/inactivar', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params
    const { motivo } = req.body
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ error: 'No autenticado' })
    }

    console.log('\n🚪 Inactivando niño:', id)
    console.log('   Motivo:', motivo)
    console.log('   Usuario:', userId)

    // Verificar permisos
    const perms = await getUserPerms(userId)
    const puedeEditar = perms.includes('ninos_editar') || perms.includes('admin')
    
    if (!puedeEditar) {
      // Verificar si es directora por rol
      const userResult = await pool.query(
        'SELECT rol FROM usuarios WHERE id = $1',
        [userId]
      )
      const esDirectora = String(userResult.rows[0]?.rol) === '1' || userResult.rows[0]?.rol === 1
      
      if (!esDirectora) {
        console.log('❌ Sin permisos')
        return res.status(403).json({ error: 'No autorizado para inactivar niños' })
      }
    }

    if (!motivo || !motivo.trim()) {
      return res.status(400).json({ error: 'El motivo de inactividad es requerido' })
    }

    // Verificar que el niño existe y está activo
    const check = await pool.query(
      'SELECT id, nombres, apellidos, activo FROM ninos WHERE id = $1',
      [id]
    )

    if (check.rows.length === 0) {
      return res.status(404).json({ error: 'Niño no encontrado' })
    }

    if (!check.rows[0].activo) {
      return res.status(400).json({ error: 'El niño ya está inactivo' })
    }

    // Inactivar el niño
    await pool.query(
      `UPDATE ninos 
       SET activo = false, 
           motivo_inactividad = $1, 
           fecha_inactivacion = NOW()
       WHERE id = $2`,
      [motivo.trim(), id]
    )

    console.log('✅ Niño inactivado:', check.rows[0].nombres, check.rows[0].apellidos)
    console.log('   Motivo:', motivo.trim())

    res.json({ 
      ok: true, 
      message: 'Niño inactivado exitosamente',
      nino: {
        id: check.rows[0].id,
        nombres: check.rows[0].nombres,
        apellidos: check.rows[0].apellidos
      }
    })
  } catch (error: any) {
    console.error('❌ Error al inactivar niño:', error.message)
    res.status(500).json({ error: 'Error al inactivar niño: ' + error.message })
  }
})

// POST /ninos/:id/reactivar - Reactivar un niño
router.post('/:id/reactivar', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params
    const userId = req.user?.id

    if (!userId) {
      return res.status(401).json({ error: 'No autenticado' })
    }

    console.log('\n✅ Reactivando niño:', id)
    console.log('   Usuario:', userId)

    // Verificar permisos
    const perms = await getUserPerms(userId)
    const puedeEditar = perms.includes('ninos_editar') || perms.includes('admin')
    
    if (!puedeEditar) {
      const userResult = await pool.query('SELECT rol FROM usuarios WHERE id = $1', [userId])
      const esDirectora = String(userResult.rows[0]?.rol) === '1' || userResult.rows[0]?.rol === 1
      
      if (!esDirectora) {
        console.log('❌ Sin permisos')
        return res.status(403).json({ error: 'No autorizado para reactivar niños' })
      }
    }

    // Verificar que el niño existe y está inactivo
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

    // Reactivar el niño
    await pool.query(
      `UPDATE ninos 
       SET activo = true, 
           motivo_inactividad = NULL, 
           fecha_inactivacion = NULL
       WHERE id = $1`,
      [id]
    )

    console.log('✅ Niño reactivado:', check.rows[0].nombres, check.rows[0].apellidos)

    res.json({ 
      ok: true, 
      message: 'Niño reactivado exitosamente',
      nino: {
        id: check.rows[0].id,
        nombres: check.rows[0].nombres,
        apellidos: check.rows[0].apellidos
      }
    })
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

    // Primero eliminar asistencias
    await pool.query('DELETE FROM asistencia WHERE nino_id = $1', [id])
    // Luego eliminar niño
    await pool.query('DELETE FROM ninos WHERE id = $1', [id])

    res.json({ ok: true })
  } catch (error: any) {
    console.error('Error al eliminar:', error.message)
    res.status(500).json({ error: error.message })
  }
})

export default router