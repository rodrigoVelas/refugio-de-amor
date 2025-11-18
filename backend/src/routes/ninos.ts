// src/routes/ninos.ts
import { Router } from 'express'
import { authMiddleware } from '../core/auth_middleware'
import { requirePerms } from '../core/perm_middleware'
import { pool } from '../core/db'

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

    // Construir query
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
        u.email as maestro_email,
        u.nombres || ' ' || COALESCE(u.apellidos, '') as maestro_nombre,
        nv.nombre as nivel_nombre,
        sn.nombre as subnivel_nombre
      FROM ninos n
      LEFT JOIN usuarios u ON n.maestro_id = u.id
      LEFT JOIN niveles nv ON n.nivel_id = nv.id
      LEFT JOIN subniveles sn ON n.subnivel_id = sn.id
      WHERE n.activo = true
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

    query += ' ORDER BY n.apellidos, n.nombres'

    console.log('\n5. Query SQL completa:')
    console.log(query)
    console.log('\n6. Parámetros:', params)

    // Ejecutar query
    const result = await pool.query(query, params)

    console.log('\n7. ✅ Resultado:')
    console.log('   - Niños encontrados:', result.rows.length)
    
    if (result.rows.length > 0) {
      console.log('\n8. Primeros 3 niños:')
      result.rows.slice(0, 3).forEach((nino, i) => {
        console.log(`   ${i + 1}. ${nino.nombres} ${nino.apellidos}`)
        console.log(`      - maestro_id: ${nino.maestro_id}`)
        console.log(`      - maestro_email: ${nino.maestro_email}`)
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
        sn.nombre as subnivel_nombre
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

// POST / - Crear niño
router.post('/', authMiddleware, async (req: any, res: any) => {
  try {
    console.log('📝 POST /ninos - Crear niño')
    console.log('Usuario:', req.user?.email)
    console.log('Datos recibidos:', req.body)
    
    const {
      codigo,
      nombres,
      apellidos,
      fecha_nacimiento,
      genero,
      direccion,
      telefono_contacto,
      nivel_id,
      subnivel_id,
      maestro_id,
      foto_url
    } = req.body

    if (!codigo || !nombres || !apellidos) {
      return res.status(400).json({ error: 'Código, nombres y apellidos son requeridos' })
    }

    // Verificar si el código ya existe
    const checkCodigo = await pool.query(
      'SELECT id FROM ninos WHERE codigo = $1',
      [codigo]
    )

    if (checkCodigo.rows.length > 0) {
      return res.status(400).json({ error: 'El código ya existe' })
    }

    const result = await pool.query(
      `INSERT INTO ninos (
        codigo, nombres, apellidos, fecha_nacimiento, genero, direccion,
        telefono_contacto, nivel_id, subnivel_id, maestro_id, foto_url, activo
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
      RETURNING *`,
      [
        codigo,
        nombres,
        apellidos,
        fecha_nacimiento || null,
        genero || null,
        direccion || null,
        telefono_contacto || null,
        nivel_id || null,
        subnivel_id || null,
        maestro_id || null,
        foto_url || null
      ]
    )

    console.log('✅ Niño creado exitosamente:', result.rows[0].id)
    res.json({ ok: true, nino: result.rows[0] })
  } catch (error: any) {
    console.error('❌ Error en POST /ninos:', error)
    res.status(500).json({ error: error.message })
  }
})

// PUT /ninos/:id - Actualizar niño
router.put('/:id', authMiddleware, requirePerms(['ninos_editar']), async (req: any, res: any) => {
  try {
    const { id } = req.params
    const userId = req.user.id
    const { 
      nombres, 
      apellidos, 
      fecha_nacimiento, 
      nivel_id, 
      subnivel_id, 
      maestro_id,
      codigo, 
      nombre_encargado, 
      telefono_encargado, 
      direccion_encargado 
    } = req.body

    if (!nombres || !apellidos || !fecha_nacimiento || !maestro_id) {
      return res.status(400).json({ error: 'Faltan campos requeridos' })
    }

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

    const result = await pool.query(
      `UPDATE ninos
      SET nombres = $1, apellidos = $2, fecha_nacimiento = $3, nivel_id = $4, 
          subnivel_id = $5, maestro_id = $6, codigo = $7, nombre_encargado = $8, 
          telefono_encargado = $9, direccion_encargado = $10, modificado_en = NOW()
      WHERE id = $11
      RETURNING *`,
      [
        nombres, apellidos, fecha_nacimiento, nivel_id || null, subnivel_id || null, 
        maestro_id, codigo || null, nombre_encargado || null, telefono_encargado || null, 
        direccion_encargado || null, id
      ]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Niño no encontrado' })
    }

    res.json({ ok: true, nino: result.rows[0] })
  } catch (error: any) {
    console.error('Error:', error)
    res.status(500).json({ error: 'Error al actualizar niño' })
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