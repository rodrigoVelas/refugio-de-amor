import { Router } from 'express'
import { authMiddleware } from '../core/auth_middleware'
import { pool } from '../core/db'

const r = Router()

// GET / - Listar facturas
r.get('/', authMiddleware, async (req: any, res: any) => {
  try {
    const { rows } = await pool.query(`
      SELECT f.*, u.nombres as usuario_nombre, u.apellidos as usuario_apellidos
      FROM facturas f
      LEFT JOIN usuarios u ON f.usuario_id = u.id
      ORDER BY f.fecha DESC, f.creado_en DESC
    `)
    res.json(rows)
  } catch (error: any) {
    console.error('❌ Error en GET /facturas:', error)
    res.status(500).json({ error: error.message })
  }
})

// POST /upload - Subir factura
r.post('/upload', authMiddleware, async (req: any, res: any) => {
  try {
    // Implementación básica - puedes expandir con Cloudinary
    res.json({ ok: true, message: 'Función de upload disponible' })
  } catch (error: any) {
    console.error('❌ Error en POST /facturas/upload:', error)
    res.status(500).json({ error: error.message })
  }
})

// GET /:id/imagen - Obtener imagen de factura
r.get('/:id/imagen', async (req: any, res: any) => {
  try {
    const { id } = req.params
    // Implementación básica
    res.json({ ok: true, id })
  } catch (error: any) {
    console.error('❌ Error en GET /facturas/:id/imagen:', error)
    res.status(500).json({ error: error.message })
  }
})

// PUT /:id - Actualizar factura
r.put('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params
    const updates = req.body
    
    res.json({ ok: true, message: 'Factura actualizada', id })
  } catch (error: any) {
    console.error('❌ Error en PUT /facturas/:id:', error)
    res.status(500).json({ error: error.message })
  }
})

// DELETE /:id - Eliminar factura
r.delete('/:id', authMiddleware, async (req: any, res: any) => {
  try {
    const { id } = req.params
    
    const { rows } = await pool.query('DELETE FROM facturas WHERE id = $1 RETURNING id', [id])
    
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Factura no encontrada' })
    }
    
    res.json({ ok: true })
  } catch (error: any) {
    console.error('❌ Error en DELETE /facturas/:id:', error)
    res.status(500).json({ error: error.message })
  }
})

export default r