// src/routes/ninos.ts
import { Router } from 'express'
import { authMiddleware } from '../core/auth_middleware'
import { requirePerms } from '../core/perm_middleware'
import { pool } from '../core/db'

const router = Router()

// GET /ninos - Listar niños con filtros (según permisos del usuario)
router.get('/', authMiddleware, async (req: any, res: any) => {
  try {
    const { colaborador_id, estado } = req.query
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
        u.nombres || ' ' || COALESCE(u.apellidos, '') as colaborador_nombre
      FROM ninos n
      LEFT JOIN usuarios u ON n.colaborador_id = u.id
      WHERE 1=1
    `
    const params: any[] = []

    // Si el usuario NO es directora/admin, solo ve sus niños asignados
    const esDirectora = userInfo.rows[0]?.rol_id === '1' // Ajusta según tu BD

    if (!esDirectora) {
      params.push(userId)
      query += ` AND n.colaborador_id = $${params.length}`
      console.log(`[ninos/list] ✅ Filtrando por colaborador: ${userId}`)
    } else {
      console.log(`[ninos/list] ⚠️ Directora - mostrará todos los niños`)
    }

    // Filtros adicionales del frontend
    if (colaborador_id && esDirectora) {
      params.push(colaborador_id)
      query += ` AND n.colaborador_id = $${params.length}`
      console.log(`[ninos/list] 🔎 Filtro frontend - colaborador: ${colaborador_id}`)
    }

    if (estado) {
      params.push(estado)
      query += ` AND n.estado = $${params.length}`
      console.log(`[ninos/list] 🔎 Filtro frontend - estado: ${estado}`)
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
    const userId = req.user.id

    console.log(`[ninos/get] Usuario ${userId} consultando niño ${id}`)

    const userInfo = await pool.query(
      'SELECT rol_id FROM usuarios WHERE id = $1',
      [userId]
    )

    const esDirectora = userInfo.rows[0]?.rol_id === '1'

    let query = `
      SELECT 
        n.*,
        u.nombres || ' ' || COALESCE(u.apellidos, '') as colaborador_nombre
      FROM ninos n
      LEFT JOIN usuarios u ON n.colaborador_id = u.id
      WHERE n.id = $1
    `
    const params: any[] = [id]

    if (!esDirectora) {
      params.push(userId)
      query += ` AND n.colaborador_id = $${params.length}`
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
      const { nombres, apellidos, fecha_nacimiento, genero, colaborador_id, estado, fecha_ingreso } = req.body

      console.log(`[ninos/create] 📝 Creando niño: ${nombres} ${apellidos}`)
      console.log(`[ninos/create] Datos recibidos:`, req.body)

      if (!nombres || !apellidos || !fecha_nacimiento || !genero || !colaborador_id) {
        console.log(`[ninos/create] ❌ Faltan campos requeridos`)
        return res.status(400).json({ error: 'Faltan campos requeridos' })
      }

      const result = await pool.query(
        `
        INSERT INTO ninos 
          (nombres, apellidos, fecha_nacimiento, genero, colaborador_id, estado, fecha_ingreso)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
        `,
        [
          nombres,
          apellidos,
          fecha_nacimiento,
          genero,
          colaborador_id,
          estado || 'activo',
          fecha_ingreso || new Date().toISOString().split('T')[0],
        ]
      )

      console.log('[ninos/create] ✅ Niño creado:', result.rows[0].id)
      res.json({ ok: true, nino: result.rows[0] })
    } catch (error: any) {
      console.error('[ninos/create] ❌ ERROR COMPLETO:')
      console.error('Mensaje:', error.message)
      console.error('Código:', error.code)
      console.error('Detalle:', error.detail)
      console.error('Stack:', error.stack)
      
      res.status(500).json({ 
        error: error.message || 'Error al crear niño',
        code: error.code,
        detail: error.detail
      })
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
      const { nombres, apellidos, fecha_nacimiento, genero, colaborador_id, estado, fecha_ingreso } = req.body
      const userId = req.user.id

      console.log(`[ninos/update] Usuario ${userId} actualizando niño ${id}`)

      if (!nombres || !apellidos || !fecha_nacimiento || !genero || !colaborador_id) {
        return res.status(400).json({ error: 'Faltan campos requeridos' })
      }

      // Verificar acceso (solo si no es directora)
      const userInfo = await pool.query(
        'SELECT rol_id FROM usuarios WHERE id = $1',
        [userId]
      )

      const esDirectora = userInfo.rows[0]?.rol_id === '1'

      if (!esDirectora) {
        const ninoCheck = await pool.query(
          'SELECT * FROM ninos WHERE id = $1 AND colaborador_id = $2',
          [id, userId]
        )

        if (ninoCheck.rows.length === 0) {
          console.log(`[ninos/update] ❌ Usuario sin acceso`)
          return res.status(403).json({ error: 'No tienes acceso a este niño' })
        }
      }

      const result = await pool.query(
        `
        UPDATE ninos
        SET nombres = $1, apellidos = $2, fecha_nacimiento = $3, genero = $4, 
            colaborador_id = $5, estado = $6, fecha_ingreso = $7
        WHERE id = $8
        RETURNING *
        `,
        [nombres, apellidos, fecha_nacimiento, genero, colaborador_id, estado, fecha_ingreso, id]
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

// DELETE /ninos/:id - Eliminar niño (eliminando todas las referencias)
router.delete(
  '/:id',
  authMiddleware,
  requirePerms(['ninos_eliminar']),
  async (req: any, res: any) => {
    try {
      const { id } = req.params

      console.log(`[ninos/delete] 🗑️ Iniciando eliminación del niño ${id}`)

      // Verificar que existe
      const check = await pool.query('SELECT id FROM ninos WHERE id = $1', [id])

      if (check.rows.length === 0) {
        console.log(`[ninos/delete] ❌ Niño no encontrado`)
        return res.status(404).json({ error: 'Niño no encontrado' })
      }

      console.log(`[ninos/delete] 🔄 Eliminando referencias en otras tablas...`)

      // Eliminar de todas las tablas que referencian a ninos
      const asistenciasResult = await pool.query('DELETE FROM asistencia WHERE nino_id = $1', [id])
      console.log(`[ninos/delete] ✅ Eliminadas ${asistenciasResult.rowCount} asistencias`)

      // Si hay otras tablas que referencian ninos, agrégalas aquí
      // Ejemplo: await pool.query('DELETE FROM otra_tabla WHERE nino_id = $1', [id])

      // Ahora eliminar el niño
      await pool.query('DELETE FROM ninos WHERE id = $1', [id])
      
      console.log('[ninos/delete] ✅ Niño eliminado exitosamente')
      res.json({ ok: true, message: 'Niño eliminado' })
    } catch (error: any) {
      console.error('[ninos/delete] ❌ ERROR COMPLETO:')
      console.error('Mensaje:', error.message)
      console.error('Código:', error.code)
      console.error('Detalle:', error.detail)
      console.error('Constraint:', error.constraint)
      console.error('Table:', error.table)
      console.error('Stack:', error.stack)
      
      res.status(500).json({ 
        error: 'Error al eliminar niño',
        details: error.message,
        code: error.code,
        constraint: error.constraint
      })
    }
  }
)

export default router