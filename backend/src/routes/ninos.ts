import { Router } from 'express'
import { authMiddleware } from '../core/auth_middleware'
import { pool } from '../core/db'

const router = Router()

// GET / - Listar niños
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

    // Construir query
    let query = `
      SELECT n.*, 
             nv.nombre as nivel_nombre,
             sn.nombre as subnivel_nombre,
             u.nombres as colaborador_nombre,
             u.apellidos as colaborador_apellidos
      FROM ninos n
      LEFT JOIN niveles nv ON n.nivel_id = nv.id
      LEFT JOIN subniveles sn ON n.subnivel_id = sn.id
      LEFT JOIN usuarios u ON n.maestro_id = u.id
      WHERE 1=1
    `
    const params: any[] = []
    let paramIndex = 1

    // Filtro por colaborador (solo si NO es directora)
    if (!esDirectora) {
      query += ` AND n.maestro_id = $${paramIndex}`
      params.push(userId)
      paramIndex++
    }

    // Búsqueda
    if (q) {
      query += ` AND (n.nombres ILIKE $${paramIndex} OR n.apellidos ILIKE $${paramIndex} OR n.codigo ILIKE $${paramIndex})`
      params.push(`%${q}%`)
      paramIndex++
    }

    // Activos/Inactivos
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

// GET /:id - Obtener un niño
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
             nv.nombre as nivel_nombre,
             sn.nombre as subnivel_nombre,
             u.nombres as colaborador_nombre,
             u.apellidos as colaborador_apellidos
      FROM ninos n
      LEFT JOIN niveles nv ON n.nivel_id = nv.id
      LEFT JOIN subniveles sn ON n.subnivel_id = sn.id
      LEFT JOIN usuarios u ON n.maestro_id = u.id
      WHERE n.id = $1
    `
    const params = [id]

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

// POST / - Crear niño (CON VALIDACIÓN DE 8 DÍGITOS)
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
      foto_url
    } = req.body

    // Validaciones
    if (!codigo || !nombres || !apellidos) {
      return res.status(400).json({ error: 'Código, nombres y apellidos son requeridos' })
    }

    // VALIDACIÓN: Teléfono debe tener exactamente 8 dígitos
    if (telefono_contacto) {
      const telefonoLimpio = telefono_contacto.replace(/\D/g, '') // Quitar no-dígitos
      if (telefonoLimpio.length !== 8) {
        return res.status(400).json({ 
          error: 'El teléfono debe tener exactamente 8 dígitos' 
        })
      }
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

    console.log('✅ Niño creado:', result.rows[0].id)
    res.json({ ok: true, nino: result.rows[0] })
  } catch (error: any) {
    console.error('❌ Error en POST /ninos:', error)
    res.status(500).json({ error: error.message })
  }
})

// PUT /:id - Actualizar niño
router.put('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params
    const updates = req.body

    // VALIDACIÓN: Teléfono debe tener exactamente 8 dígitos
    if (updates.telefono_contacto) {
      const telefonoLimpio = updates.telefono_contacto.replace(/\D/g, '')
      if (telefonoLimpio.length !== 8) {
        return res.status(400).json({ 
          error: 'El teléfono debe tener exactamente 8 dígitos' 
        })
      }
    }

    const allowedFields = [
      'codigo', 'nombres', 'apellidos', 'fecha_nacimiento', 'genero',
      'direccion', 'telefono_contacto', 'nivel_id', 'subnivel_id',
      'maestro_id', 'foto_url', 'activo', 'motivo_inactividad', 'fecha_inactivacion'
    ]

    const setClauses: string[] = []
    const values: any[] = []
    let paramIndex = 1

    Object.keys(updates).forEach(key => {
      if (allowedFields.includes(key)) {
        setClauses.push(`${key} = $${paramIndex}`)
        values.push(updates[key])
        paramIndex++
      }
    })

    if (setClauses.length === 0) {
      return res.status(400).json({ error: 'No hay campos válidos para actualizar' })
    }

    values.push(id)

    const query = `
      UPDATE ninos 
      SET ${setClauses.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING *
    `

    const result = await pool.query(query, values)

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Niño no encontrado' })
    }

    res.json({ ok: true, nino: result.rows[0] })
  } catch (error: any) {
    console.error('❌ Error en PUT /ninos/:id:', error)
    res.status(500).json({ error: error.message })
  }
})

// DELETE /:id - Eliminar niño
router.delete('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params

    const result = await pool.query('DELETE FROM ninos WHERE id = $1 RETURNING id', [id])

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