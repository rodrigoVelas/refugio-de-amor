// src/routes/ninos.ts
import { Router } from 'express'
import { authMiddleware } from '../core/auth_middleware'
import { requirePerms } from '../core/perm_middleware'
import { pool } from '../core/db'

const router = Router()

// Helper: Verificar si es directora (rol_id = 1)
async function esDirectora(userId: string): Promise<boolean> {
  try {
    const result = await pool.query(
      `SELECT u.rol_id, r.nombre as rol_nombre 
       FROM usuarios u 
       INNER JOIN roles r ON u.rol_id = r.id 
       WHERE u.id = $1`,
      [userId]
    )
    
    if (result.rows.length === 0) {
      console.log(`[esDirectora] ❌ Usuario ${userId} NO encontrado`)
      return false
    }
    
    const rolId = String(result.rows[0].rol_id)
    const rolNombre = result.rows[0].rol_nombre
    
    console.log(`[esDirectora] Usuario ${userId} → Rol: ${rolNombre} (ID: ${rolId})`)
    
    const esDir = rolId === '1' || result.rows[0].rol_id === 1
    
    console.log(`[esDirectora] ¿Es directora? ${esDir}`)
    
    return esDir
  } catch (error) {
    console.error('[esDirectora] ❌ Error:', error)
    return false
  }
}

// GET /ninos - Listar niños
router.get('/', authMiddleware, async (req: any, res: any) => {
  try {
    const userId = req.user.id

    console.log(`\n${'='.repeat(60)}`)
    console.log(`GET /ninos`)
    console.log(`Usuario: ${userId}`)

    const esDir = await esDirectora(userId)

    // IGUAL QUE ASISTENCIA.TS - usar maestro_id
    let query = `
      SELECT 
        n.id,
        n.codigo,
        n.nombres,
        n.apellidos,
        n.fecha_nacimiento,
        n.maestro_id,
        n.colaborador_id,
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

    // CRÍTICO: Usar maestro_id igual que asistencia.ts
    if (!esDir) {
      params.push(userId)
      query += ` AND n.maestro_id = $1`
      console.log(`🔒 COLABORADOR → Filtrando por maestro_id = ${userId}`)
    } else {
      console.log(`👑 DIRECTORA → Ve todos los niños`)
    }

    query += ' ORDER BY n.apellidos, n.nombres'

    console.log(`Query:`, query)
    console.log(`Params:`, params)

    const result = await pool.query(query, params)

    console.log(`✅ Resultado: ${result.rows.length} niños encontrados`)
    console.log(`${'='.repeat(60)}\n`)

    res.json(result.rows)
  } catch (error: any) {
    console.error('[ninos/list] Error:', error)
    res.status(500).json({ error: 'Error al listar niños' })
  }
})

// GET /ninos/:id - Ver un niño específico
router.get('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    const esDir = await esDirectora(userId)

    let query = `
      SELECT 
        n.*,
        u.nombres || ' ' || COALESCE(u.apellidos, '') as maestro_nombre
      FROM ninos n
      LEFT JOIN usuarios u ON n.maestro_id = u.id
      WHERE n.id = $1
    `
    const params: any[] = [id]

    if (!esDir) {
      params.push(userId)
      query += ` AND n.maestro_id = $2`
    }

    const result = await pool.query(query, params)

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Niño no encontrado o sin acceso' })
    }

    res.json(result.rows[0])
  } catch (error: any) {
    console.error('[ninos/get] Error:', error)
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
      maestro_id, // USAR maestro_id
      codigo, 
      nombre_encargado, 
      telefono_encargado, 
      direccion_encargado 
    } = req.body

    console.log(`\n=== POST /ninos ===`)
    console.log(`Maestro ID recibido: ${maestro_id}`)

    if (!nombres || !apellidos || !fecha_nacimiento || !maestro_id) {
      return res.status(400).json({ error: 'Faltan campos requeridos: nombres, apellidos, fecha_nacimiento, maestro_id' })
    }

    const result = await pool.query(
      `INSERT INTO ninos 
        (nombres, apellidos, fecha_nacimiento, nivel_id, subnivel_id, maestro_id, 
         activo, codigo, nombre_encargado, telefono_encargado, direccion_encargado, creado_en)
      VALUES ($1, $2, $3, $4, $5, $6, true, $7, $8, $9, $10, NOW())
      RETURNING *`,
      [
        nombres, 
        apellidos, 
        fecha_nacimiento, 
        nivel_id || null, 
        subnivel_id || null, 
        maestro_id, // USAR maestro_id
        codigo || null, 
        nombre_encargado || null, 
        telefono_encargado || null, 
        direccion_encargado || null
      ]
    )

    console.log(`✅ Niño creado: ${result.rows[0].id}`)
    console.log(`   maestro_id: ${result.rows[0].maestro_id}`)
    console.log(`==================\n`)

    res.json({ ok: true, nino: result.rows[0] })
  } catch (error: any) {
    console.error('[ninos/create] Error:', error.message)
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

    const esDir = await esDirectora(userId)

    if (!esDir) {
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
          telefono_encargado = $9, direccion_encargado = $10, modificado_en = NOW(), modificado_por = $11
      WHERE id = $12
      RETURNING *`,
      [
        nombres, apellidos, fecha_nacimiento, nivel_id || null, subnivel_id || null, 
        maestro_id, codigo || null, nombre_encargado || null, telefono_encargado || null, 
        direccion_encargado || null, userId, id
      ]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Niño no encontrado' })
    }

    res.json({ ok: true, nino: result.rows[0] })
  } catch (error: any) {
    console.error('[ninos/update] Error:', error)
    res.status(500).json({ error: 'Error al actualizar niño' })
  }
})

// DELETE /ninos/:id - Eliminar niño
router.delete('/:id', authMiddleware, requirePerms(['ninos_eliminar']), async (req: any, res: any) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    const esDir = await esDirectora(userId)

    let checkQuery = 'SELECT id FROM ninos WHERE id = $1'
    const checkParams: any[] = [id]

    if (!esDir) {
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
    console.error('[ninos/delete] Error:', error.message)
    res.status(500).json({ error: error.message })
  }
})

export default router