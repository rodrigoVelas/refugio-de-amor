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
      `SELECT r.id, r.nombre 
       FROM usuarios u 
       INNER JOIN roles r ON u.rol_id = r.id 
       WHERE u.id = $1`,
      [userId]
    )
    
    if (result.rows.length === 0) {
      console.log(`[esDirectora] ❌ Usuario ${userId} NO encontrado`)
      return false
    }
    
    const rolId = result.rows[0].id
    const rolNombre = result.rows[0].nombre
    
    console.log(`[esDirectora] Usuario ${userId} → Rol: "${rolNombre}" (ID: ${rolId})`)
    
    // El rol_id 1 es directora
    const esDirectora = String(rolId) === '1'
    
    console.log(`[esDirectora] ¿Es directora? ${esDirectora}`)
    
    return esDirectora
  } catch (error) {
    console.error('[esDirectora] ❌ Error:', error)
    return false
  }
}

// GET /ninos - Listar niños con filtros
router.get('/', authMiddleware, async (req: any, res: any) => {
  try {
    const { activo } = req.query
    const userId = req.user.id

    console.log(`\n========== GET /ninos ==========`)
    console.log(`[ninos/list] 👤 Usuario: ${userId}`)

    const esDir = await esDirectora(userId)

    let query = `
      SELECT 
        n.*,
        u.nombres || ' ' || COALESCE(u.apellidos, '') as colaborador_nombre,
        nv.nombre as nivel_nombre,
        sn.nombre as subnivel_nombre
      FROM ninos n
      LEFT JOIN usuarios u ON n.colaborador_id = u.id
      LEFT JOIN niveles nv ON n.nivel_id = nv.id
      LEFT JOIN subniveles sn ON n.subnivel_id = sn.id
      WHERE 1=1
    `
    const params: any[] = []

    // CRÍTICO: Si NO es directora, solo ve sus niños
    if (!esDir) {
      params.push(userId)
      query += ` AND n.colaborador_id = $${params.length}`
      console.log(`[ninos/list] 🔒 COLABORADOR → Solo niños con colaborador_id = ${userId}`)
    } else {
      console.log(`[ninos/list] 👑 DIRECTORA → Ve TODOS los niños`)
    }

    // Filtro de activo
    if (activo !== undefined) {
      params.push(activo === 'true')
      query += ` AND n.activo = $${params.length}`
      console.log(`[ninos/list] Filtro activo = ${activo}`)
    }

    query += ' ORDER BY n.apellidos, n.nombres'

    console.log(`[ninos/list] 📝 Query final:`, query)
    console.log(`[ninos/list] 📝 Params:`, params)

    const result = await pool.query(query, params)
    console.log(`[ninos/list] ✅ Retornando ${result.rows.length} niños`)
    console.log(`================================\n`)
    
    res.json(result.rows)
  } catch (error: any) {
    console.error('[ninos/list] ❌ Error:', error)
    res.status(500).json({ error: 'Error al listar niños' })
  }
})

// GET /ninos/:id - Ver un niño específico
router.get('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    console.log(`[ninos/get] Usuario ${userId} consultando niño ${id}`)

    const esDir = await esDirectora(userId)

    let query = `
      SELECT 
        n.*,
        u.nombres || ' ' || COALESCE(u.apellidos, '') as colaborador_nombre,
        nv.nombre as nivel_nombre,
        sn.nombre as subnivel_nombre
      FROM ninos n
      LEFT JOIN usuarios u ON n.colaborador_id = u.id
      LEFT JOIN niveles nv ON n.nivel_id = nv.id
      LEFT JOIN subniveles sn ON n.subnivel_id = sn.id
      WHERE n.id = $1
    `
    const params: any[] = [id]

    if (!esDir) {
      params.push(userId)
      query += ` AND n.colaborador_id = $${params.length}`
      console.log(`[ninos/get] Verificando acceso del colaborador`)
    }

    const result = await pool.query(query, params)

    if (result.rows.length === 0) {
      console.log(`[ninos/get] ❌ Niño no encontrado o sin acceso`)
      return res.status(404).json({ error: 'Niño no encontrado o sin acceso' })
    }

    console.log(`[ninos/get] ✅ Niño encontrado`)
    res.json(result.rows[0])
  } catch (error: any) {
    console.error('[ninos/get] ❌ Error:', error)
    res.status(500).json({ error: 'Error al obtener niño' })
  }
})

// POST /ninos - Crear nuevo niño
router.post(
  '/',
  authMiddleware,
  requirePerms(['ninos_crear']),
  async (req: any, res: any) => {
    try {
      const { 
        nombres, 
        apellidos, 
        fecha_nacimiento, 
        nivel_id, 
        subnivel_id, 
        maestro_id,
        colaborador_id,
        codigo,
        nombre_encargado,
        telefono_encargado,
        direccion_encargado
      } = req.body

      console.log(`[ninos/create] 📝 Creando niño: ${nombres} ${apellidos}`)
      console.log(`[ninos/create] Colaborador asignado: ${colaborador_id}`)

      if (!nombres || !apellidos || !fecha_nacimiento || !colaborador_id) {
        return res.status(400).json({ error: 'Faltan campos requeridos: nombres, apellidos, fecha_nacimiento, colaborador_id' })
      }

      const result = await pool.query(
        `
        INSERT INTO ninos 
          (nombres, apellidos, fecha_nacimiento, nivel_id, subnivel_id, maestro_id, colaborador_id, 
           activo, codigo, nombre_encargado, telefono_encargado, direccion_encargado, creado_en)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
        RETURNING *
        `,
        [
          nombres,
          apellidos,
          fecha_nacimiento,
          nivel_id || null,
          subnivel_id || null,
          maestro_id || null,
          colaborador_id,
          true,
          codigo || null,
          nombre_encargado || null,
          telefono_encargado || null,
          direccion_encargado || null
        ]
      )

      console.log('[ninos/create] ✅ Niño creado con ID:', result.rows[0].id)
      res.json({ ok: true, nino: result.rows[0] })
    } catch (error: any) {
      console.error('[ninos/create] ❌ ERROR:', error.message)
      res.status(500).json({ error: error.message })
    }
  }
)

// PUT /ninos/:id - Actualizar niño
router.put(
  '/:id',
  authMiddleware,
  requirePerms(['ninos_editar']),
  async (req: any, res: any) => {
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
        colaborador_id,
        activo,
        codigo,
        nombre_encargado,
        telefono_encargado,
        direccion_encargado,
        fecha_baja
      } = req.body

      console.log(`[ninos/update] Usuario ${userId} actualizando niño ${id}`)

      if (!nombres || !apellidos || !fecha_nacimiento || !colaborador_id) {
        return res.status(400).json({ error: 'Faltan campos requeridos' })
      }

      const esDir = await esDirectora(userId)

      // Si NO es directora, verificar que el niño le pertenezca
      if (!esDir) {
        const ninoCheck = await pool.query(
          'SELECT * FROM ninos WHERE id = $1 AND colaborador_id = $2',
          [id, userId]
        )

        if (ninoCheck.rows.length === 0) {
          console.log(`[ninos/update] ❌ Colaborador sin acceso a este niño`)
          return res.status(403).json({ error: 'No tienes acceso a este niño' })
        }
      }

      const result = await pool.query(
        `
        UPDATE ninos
        SET nombres = $1, apellidos = $2, fecha_nacimiento = $3, nivel_id = $4, 
            subnivel_id = $5, maestro_id = $6, colaborador_id = $7, activo = $8,
            codigo = $9, nombre_encargado = $10, telefono_encargado = $11, 
            direccion_encargado = $12, fecha_baja = $13, modificado_en = NOW(),
            modificado_por = $14
        WHERE id = $15
        RETURNING *
        `,
        [
          nombres, apellidos, fecha_nacimiento, nivel_id || null, subnivel_id || null,
          maestro_id || null, colaborador_id, activo !== undefined ? activo : true,
          codigo || null, nombre_encargado || null, telefono_encargado || null,
          direccion_encargado || null, fecha_baja || null, userId, id
        ]
      )

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Niño no encontrado' })
      }

      console.log('[ninos/update] ✅ Niño actualizado')
      res.json({ ok: true, nino: result.rows[0] })
    } catch (error: any) {
      console.error('[ninos/update] ❌ Error:', error)
      res.status(500).json({ error: 'Error al actualizar niño' })
    }
  }
)

// DELETE /ninos/:id - Eliminar niño
router.delete(
  '/:id',
  authMiddleware,
  requirePerms(['ninos_eliminar']),
  async (req: any, res: any) => {
    try {
      const { id } = req.params
      const userId = req.user.id

      console.log(`[ninos/delete] 🗑️ Usuario ${userId} eliminando niño ${id}`)

      const esDir = await esDirectora(userId)

      let checkQuery = 'SELECT id, colaborador_id FROM ninos WHERE id = $1'
      const checkParams: any[] = [id]

      if (!esDir) {
        checkParams.push(userId)
        checkQuery += ' AND colaborador_id = $2'
      }

      const check = await pool.query(checkQuery, checkParams)

      if (check.rows.length === 0) {
        console.log(`[ninos/delete] ❌ Niño no encontrado o sin acceso`)
        return res.status(404).json({ error: 'Niño no encontrado o sin acceso' })
      }

      console.log(`[ninos/delete] Eliminando asistencias...`)
      await pool.query('DELETE FROM asistencia WHERE nino_id = $1', [id])
      
      console.log(`[ninos/delete] Eliminando niño...`)
      await pool.query('DELETE FROM ninos WHERE id = $1', [id])
      
      console.log('[ninos/delete] ✅ Niño eliminado exitosamente')
      res.json({ ok: true })
    } catch (error: any) {
      console.error('[ninos/delete] ❌ ERROR:', error.message)
      res.status(500).json({ error: error.message })
    }
  }
)

export default router