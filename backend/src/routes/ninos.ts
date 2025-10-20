// src/routes/ninos.ts
import { Router } from 'express'
import { authMiddleware } from '../core/auth_middleware'
import { requirePerms } from '../core/perm_middleware'
import { pool } from '../core/db'

const router = Router()

// GET /ninos - Listar niños con filtros (según permisos del usuario)
router.get('/', authMiddleware, async (req: any, res: any) => {
  try {
    const { colaborador_id, nivel_id, subnivel_id, activo } = req.query
    const userId = req.user.id

    console.log(`[ninos/list] 🔍 Usuario ID: ${userId}`)

    // Obtener info del usuario
    const userInfo = await pool.query(
      'SELECT rol_id FROM usuarios WHERE id = $1',
      [userId]
    )

    console.log(`[ninos/list] 📋 Info usuario:`, userInfo.rows[0])

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

    // Si el usuario NO es directora/admin, solo ve sus niños asignados
    const esDirectora = userInfo.rows[0]?.rol_id === '1'

    if (!esDirectora) {
      params.push(userId)
      query += ` AND n.colaborador_id = $${params.length}`
      console.log(`[ninos/list] ✅ Filtrando por colaborador: ${userId}`)
    }

    // Filtros adicionales
    if (colaborador_id && esDirectora) {
      params.push(colaborador_id)
      query += ` AND n.colaborador_id = $${params.length}`
    }

    if (nivel_id) {
      params.push(nivel_id)
      query += ` AND n.nivel_id = $${params.length}`
    }

    if (subnivel_id) {
      params.push(subnivel_id)
      query += ` AND n.subnivel_id = $${params.length}`
    }

    if (activo !== undefined) {
      params.push(activo === 'true')
      query += ` AND n.activo = $${params.length}`
    }

    query += ' ORDER BY n.apellidos, n.nombres'

    const result = await pool.query(query, params)
    console.log(`[ninos/list] ✅ Encontrados ${result.rows.length} niños`)
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

    const result = await pool.query(
      `
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
      `,
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Niño no encontrado' })
    }

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

      if (!nombres || !apellidos || !fecha_nacimiento || !colaborador_id) {
        return res.status(400).json({ error: 'Faltan campos requeridos' })
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
          true, // activo por defecto
          codigo || null,
          nombre_encargado || null,
          telefono_encargado || null,
          direccion_encargado || null
        ]
      )

      console.log('[ninos/create] ✅ Niño creado:', result.rows[0].id)
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

      console.log(`[ninos/update] Actualizando niño ${id}`)

      if (!nombres || !apellidos || !fecha_nacimiento || !colaborador_id) {
        return res.status(400).json({ error: 'Faltan campos requeridos' })
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
          direccion_encargado || null, fecha_baja || null, req.user.id, id
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

      console.log(`[ninos/delete] 🗑️ Eliminando niño ${id}`)

      const check = await pool.query('SELECT id FROM ninos WHERE id = $1', [id])

      if (check.rows.length === 0) {
        return res.status(404).json({ error: 'Niño no encontrado' })
      }

      // Eliminar asistencias
      await pool.query('DELETE FROM asistencia WHERE nino_id = $1', [id])
      console.log(`[ninos/delete] ✅ Asistencias eliminadas`)

      // Eliminar niño
      await pool.query('DELETE FROM ninos WHERE id = $1', [id])
      
      console.log('[ninos/delete] ✅ Niño eliminado')
      res.json({ ok: true })
    } catch (error: any) {
      console.error('[ninos/delete] ❌ ERROR:', error.message)
      res.status(500).json({ error: error.message })
    }
  }
)

export default router