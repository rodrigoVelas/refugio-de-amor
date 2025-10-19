// src/routes/ninos.ts
import { Router } from 'express'
import { authMiddleware } from '../core/auth_middleware'
import { requirePerms } from '../core/perm_middleware'
import { pool } from '../core/db'
import multer from 'multer'
import cloudinary from '../lib/cloudinary'
import { Readable } from 'stream'

const router = Router()

// Configurar multer para fotos
const storage = multer.memoryStorage()
const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB máximo
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true)
    } else {
      cb(new Error('Solo se permiten imágenes'))
    }
  },
})

// Helper: subir foto a Cloudinary
async function uploadFotoCloudinary(buffer: Buffer, filename: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: 'refugio_ninos',
        resource_type: 'image',
        public_id: `${Date.now()}_${filename.replace(/\.[^/.]+$/, '')}`,
      },
      (error, result) => {
        if (error) {
          console.error('[uploadFotoCloudinary] Error:', error)
          reject(error)
        } else {
          console.log('[uploadFotoCloudinary] Success:', result?.secure_url)
          resolve(result!.secure_url)
        }
      }
    )

    const readableStream = new Readable()
    readableStream.push(buffer)
    readableStream.push(null)
    readableStream.pipe(uploadStream)
  })
}

// GET /ninos - Listar niños con filtros
router.get('/', authMiddleware, async (req: any, res: any) => {
  try {
    const { nivel_id, subnivel_id, estado } = req.query

    let query = `
      SELECT 
        n.*,
        nv.nombre as nivel_nombre,
        sn.nombre as subnivel_nombre
      FROM ninos n
      LEFT JOIN niveles nv ON n.nivel_id = nv.id
      LEFT JOIN subniveles sn ON n.subnivel_id = sn.id
      WHERE 1=1
    `
    const params: any[] = []

    if (nivel_id) {
      params.push(nivel_id)
      query += ` AND n.nivel_id = $${params.length}`
    }

    if (subnivel_id) {
      params.push(subnivel_id)
      query += ` AND n.subnivel_id = $${params.length}`
    }

    if (estado) {
      params.push(estado)
      query += ` AND n.estado = $${params.length}`
    }

    query += ' ORDER BY n.apellidos, n.nombres'

    const result = await pool.query(query, params)
    console.log(`[ninos/list] Encontrados: ${result.rows.length}`)
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

    const result = await pool.query(
      `
      SELECT 
        n.*,
        nv.nombre as nivel_nombre,
        sn.nombre as subnivel_nombre
      FROM ninos n
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
    console.error('[ninos/get] Error:', error)
    res.status(500).json({ error: 'Error al obtener niño' })
  }
})

// POST /ninos - Crear nuevo niño
router.post(
  '/',
  authMiddleware,
  requirePerms(['ninos_crear']),
  upload.single('foto'),
  async (req: any, res: any) => {
    try {
      const { nombres, apellidos, fecha_nacimiento, genero, nivel_id, subnivel_id, estado, fecha_ingreso } = req.body
      const file = req.file

      if (!nombres || !apellidos || !fecha_nacimiento || !genero || !nivel_id || !subnivel_id) {
        return res.status(400).json({ error: 'Faltan campos requeridos' })
      }

      let fotoUrl = null
      if (file) {
        console.log('[ninos/create] Subiendo foto...')
        fotoUrl = await uploadFotoCloudinary(file.buffer, file.originalname)
      }

      const result = await pool.query(
        `
        INSERT INTO ninos 
          (nombres, apellidos, fecha_nacimiento, genero, nivel_id, subnivel_id, foto_url, estado, fecha_ingreso)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING *
        `,
        [
          nombres,
          apellidos,
          fecha_nacimiento,
          genero,
          nivel_id,
          subnivel_id,
          fotoUrl,
          estado || 'activo',
          fecha_ingreso || new Date().toISOString().split('T')[0],
        ]
      )

      console.log('[ninos/create] Niño creado:', result.rows[0].id)
      res.json({ ok: true, nino: result.rows[0] })
    } catch (error: any) {
      console.error('[ninos/create] Error:', error)
      res.status(500).json({ error: error.message || 'Error al crear niño' })
    }
  }
)

// PUT /ninos/:id - Actualizar niño
router.put(
  '/:id',
  authMiddleware,
  requirePerms(['ninos_editar']),
  upload.single('foto'),
  async (req: any, res: any) => {
    try {
      const { id } = req.params
      const { nombres, apellidos, fecha_nacimiento, genero, nivel_id, subnivel_id, estado, fecha_ingreso } = req.body
      const file = req.file

      if (!nombres || !apellidos || !fecha_nacimiento || !genero || !nivel_id || !subnivel_id) {
        return res.status(400).json({ error: 'Faltan campos requeridos' })
      }

      let fotoUrl = null
      if (file) {
        console.log('[ninos/update] Subiendo nueva foto...')
        fotoUrl = await uploadFotoCloudinary(file.buffer, file.originalname)
      }

      const updateQuery = fotoUrl
        ? `
          UPDATE ninos
          SET nombres = $1, apellidos = $2, fecha_nacimiento = $3, genero = $4, 
              nivel_id = $5, subnivel_id = $6, foto_url = $7, estado = $8, fecha_ingreso = $9
          WHERE id = $10
          RETURNING *
        `
        : `
          UPDATE ninos
          SET nombres = $1, apellidos = $2, fecha_nacimiento = $3, genero = $4, 
              nivel_id = $5, subnivel_id = $6, estado = $7, fecha_ingreso = $8
          WHERE id = $9
          RETURNING *
        `

      const params = fotoUrl
        ? [nombres, apellidos, fecha_nacimiento, genero, nivel_id, subnivel_id, fotoUrl, estado, fecha_ingreso, id]
        : [nombres, apellidos, fecha_nacimiento, genero, nivel_id, subnivel_id, estado, fecha_ingreso, id]

      const result = await pool.query(updateQuery, params)

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Niño no encontrado' })
      }

      console.log('[ninos/update] Niño actualizado:', id)
      res.json({ ok: true, nino: result.rows[0] })
    } catch (error: any) {
      console.error('[ninos/update] Error:', error)
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

      // Obtener foto_url si existe
      const nino = await pool.query('SELECT foto_url FROM ninos WHERE id = $1', [id])

      if (nino.rows.length === 0) {
        return res.status(404).json({ error: 'Niño no encontrado' })
      }

      // Eliminar foto de Cloudinary si existe
      if (nino.rows[0].foto_url) {
        const url = nino.rows[0].foto_url
        const publicIdMatch = url.match(/refugio_ninos\/([^/]+)/)

        if (publicIdMatch) {
          const publicId = `refugio_ninos/${publicIdMatch[1]}`
          try {
            await cloudinary.uploader.destroy(publicId)
            console.log('[ninos/delete] Foto eliminada de Cloudinary:', publicId)
          } catch (cloudError) {
            console.error('[ninos/delete] Error eliminando foto:', cloudError)
          }
        }
      }

      // Eliminar de BD
      await pool.query('DELETE FROM ninos WHERE id = $1', [id])

      console.log('[ninos/delete] Niño eliminado:', id)
      res.json({ ok: true })
    } catch (error: any) {
      console.error('[ninos/delete] Error:', error)
      res.status(500).json({ error: 'Error al eliminar niño' })
    }
  }
)

export default router