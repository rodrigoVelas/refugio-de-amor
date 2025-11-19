import { Router } from 'express'
import { authMiddleware } from '../core/auth_middleware'
import { pool } from '../core/db'

const router = Router()

// ===============================
// GET / - Listar niños
// ===============================
router.get('/', authMiddleware, async (req: any, res: any) => {
  try {
    const userId = req.user.id
    const { q, incluirInactivos } = req.query

    // Obtener rol del usuario
    const userQuery = await pool.query(
      'SELECT email, nombres, rol FROM usuarios WHERE id = $1',
      [userId]
    )

    if (userQuery.rows.length === 0) {
      return res.status(401).json({ error: 'Usuario no encontrado' })
    }

    const userData = userQuery.rows[0]
    const esDirectora = userData.rol === 'directora'

    // Construir query base
    let query = `
      SELECT n.*,
             nv.nombre AS nivel_nombre,
             sn.nombre AS subnivel_nombre,
             u.nombres AS colaborador_nombre,
             u.apellidos AS colaborador_apellidos
      FROM ninos n
      LEFT JOIN niveles nv ON n.nivel_id = nv.id
      LEFT JOIN subniveles sn ON n.subnivel_id = sn.id
      LEFT JOIN usuarios u ON n.maestro_id = u.id
      WHERE 1=1
    `
    const params: any[] = []
    let paramIndex = 1

    // 🔒 Si no es directora, ver solo sus niños
    if (!esDirectora) {
      query += ` AND n.maestro_id = $${paramIndex}`
      params.push(userId)
      paramIndex++
    }

    // 🔍 Búsqueda por texto
    if (q) {
      query += ` AND (
        n.nombres ILIKE $${paramIndex} OR
        n.apellidos ILIKE $${paramIndex} OR
        n.codigo ILIKE $${paramIndex}
      )`
      params.push(`%${q}%`)
      paramIndex++
    }

    // 🔧 Filtrado por activos/inactivos
    if (!incluirInactivos || incluirInactivos === 'false') {
      query += ' AND n.activo = true'
    }

    query += ' ORDER BY n.nombres, n.apellidos'

    const result = await pool.query(query, params)
    res.json(result.rows)
  } catch (error: any) {
    console.error('❌ Error en GET /ninos:', error)
    res.status(500).json({ error: error.message })
  }
})


// ===============================
// GET /:id - Obtener niño
// ===============================
router.get('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params
    const userId = req.user.id

    const userQuery = await pool.query(
      'SELECT rol FROM usuarios WHERE id = $1',
      [userId]
    )

    const esDirectora = userQuery.rows[0]?.rol === 'directora'

    let query = `
      SELECT n.*,
             nv.nombre AS nivel_nombre,
             sn.nombre AS subnivel_nombre,
             u.nombres AS colaborador_nombre,
             u.apellidos AS colaborador_apellidos
      FROM ninos n
      LEFT JOIN niveles nv ON n.nivel_id = nv.id
      LEFT JOIN subniveles sn ON n.subnivel_id = sn.id
      LEFT JOIN usuarios u ON n.maestro_id = u.id
      WHERE n.id = $1
    `
    const params: any[] = [id]

    if (!esDirectora) {
      query += ' AND n.maestro_id = $2'
      params.push(userId)
    }

    const result = await pool.query(query, params)

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Niño no encontrado' })
    }

    res.json(result.rows[0])
  } catch (error: any) {
    console.error('❌ Error en GET /ninos/:id:', error)
    res.status(500).json({ error: error.message })
  }
})


// ===============================
// POST / - Crear niño
// ===============================
router.post('/', authMiddleware, async (req: any, res: any) => {
  try {
    console.log('📝 POST /ninos - Crear niño')
    console.log('Usuario:', req.user?.email)
    console.log('Datos:', req.body)

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
      nombre_encargado,
      telefono_encargado,
      direccion_encargado,
      colaborador_id
    } = req.body

    // Validaciones mínimas
    if (!codigo || !nombres || !apellidos) {
      return res.status(400).json({
        error: 'Código, nombres y apellidos son requeridos'
      })
    }

    // Validación teléfono niño
    if (telefono_contacto) {
      const clean = telefono_contacto.replace(/\D/g, '')
      if (clean.length !== 8) {
        return res.status(400).json({
          error: 'El teléfono debe tener exactamente 8 dígitos'
        })
      }
    }

    // Validación teléfono encargado
    if (telefono_encargado) {
      const clean = telefono_encargado.replace(/\D/g, '')
      if (clean.length !== 8) {
        return res.status(400).json({
          error: 'El teléfono del encargado debe tener exactamente 8 dígitos'
        })
      }
    }

    // Código único
    const checkCodigo = await pool.query(
      'SELECT id FROM ninos WHERE codigo = $1',
      [codigo]
    )
    if (checkCodigo.rows.length > 0) {
      return res.status(400).json({ error: 'El código ya existe' })
    }

    const result = await pool.query(
      `INSERT INTO ninos (
        codigo, nombres, apellidos, fecha_nacimiento, genero,
        direccion, telefono_contacto, nivel_id, subnivel_id,
        maestro_id, activo, nombre_encargado, telefono_encargado,
        direccion_encargado, colaborador_id
      ) VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9,
        $10, true, $11, $12,
        $13, $14
      )
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
        nombre_encargado || null,
        telefono_encargado || null,
        direccion_encargado || null,
        colaborador_id || null
      ]
    )

    console.log('✅ Niño creado:', result.rows[0].id)
    res.json({ ok: true, nino: result.rows[0] })
  } catch (error: any) {
    console.error('❌ Error en POST /ninos:', error)
    res.status(500).json({ error: error.message })
  }
})


// ===============================
// PUT /:id - Actualizar niño
// ===============================
router.put('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params
    const updates = req.body

    const allowed = [
      'codigo', 'nombres', 'apellidos', 'fecha_nacimiento', 'genero',
      'direccion', 'telefono_contacto', 'nivel_id', 'subnivel_id',
      'maestro_id', 'activo', 'motivo_inactividad', 'fecha_inactivacion',
      'nombre_encargado', 'telefono_encargado', 'direccion_encargado',
      'colaborador_id'
    ]

    // Validación teléfonos
    if (updates.telefono_contacto) {
      const clean = updates.telefono_contacto.replace(/\D/g, '')
      if (clean.length !== 8) {
        return res.status(400).json({
          error: 'El teléfono debe tener exactamente 8 dígitos'
        })
      }
    }

    if (updates.telefono_encargado) {
      const clean = updates.telefono_encargado.replace(/\D/g, '')
      if (clean.length !== 8) {
        return res.status(400).json({
          error: 'El teléfono del encargado debe tener exactamente 8 dígitos'
        })
      }
    }

    const setClauses: string[] = []
    const values: any[] = []
    let paramIndex = 1

    Object.keys(updates).forEach(key => {
      if (allowed.includes(key)) {
        setClauses.push(`${key} = $${paramIndex}`)
        values.push(updates[key])
        paramIndex++
      }
    })

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No hay campos válidos para actualizar' })
    }

    values.push(id)

    const result = await pool.query(
      `UPDATE ninos
       SET ${setClauses.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      values
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Niño no encontrado' })
    }

    res.json({ ok: true, nino: result.rows[0] })
  } catch (error: any) {
    console.error('❌ Error en PUT /ninos/:id:', error)
    res.status(500).json({ error: error.message })
  }
})


// ===============================
// DELETE /:id - Eliminar niño
// ===============================
router.delete('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params

    const result = await pool.query(
      'DELETE FROM ninos WHERE id = $1 RETURNING id',
      [id]
    )

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Niño no encontrado' })
    }

    res.json({ ok: true })
  } catch (error: any) {
    console.error('❌ Error en DELETE /ninos/:id:', error)
    res.status(500).json({ error: error.message })
  }
})

export default router
