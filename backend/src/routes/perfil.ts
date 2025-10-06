import { Router } from 'express'
import { pool } from '../core/db'

const r = Router()

console.log('===== PERFIL.TS CARGADO =====')

r.get('/perfil', async (req: any, res: any) => {
  console.log('>>> GET /perfil ejecutándose')
  console.log('>>> req.user:', req.user)
  
  try {
    if (!req.user || !req.user.id) {
      console.log('>>> ERROR: req.user no existe')
      return res.status(401).json({ error: 'No autenticado' })
    }

    const userId = req.user.id
    console.log('>>> Buscando usuario:', userId)
    
    const { rows } = await pool.query(
      'select id, email, nombres, apellidos, telefono, avatar_url from usuarios where id=$1',
      [userId]
    )
    
    if (rows.length === 0) {
      console.log('>>> Usuario no encontrado en BD')
      return res.status(404).json({ error: 'Usuario no encontrado' })
    }
    
    console.log('>>> Enviando respuesta exitosa')
    res.json(rows[0])
  } catch (error) {
    console.error('>>> ERROR en GET /perfil:', error)
    res.status(500).json({ error: 'Error interno' })
  }
})

r.put('/perfil', async (req: any, res: any) => {
  try {
    if (!req.user || !req.user.id) {
      return res.status(401).json({ error: 'No autenticado' })
    }

    const userId = req.user.id
    const { nombres, apellidos, telefono, avatar_url } = req.body
    
    await pool.query(
      'update usuarios set nombres=$1, apellidos=$2, telefono=$3, avatar_url=$4, modificado_en=now(), modificado_por=$5 where id=$6',
      [nombres?.trim(), apellidos?.trim(), telefono?.trim() || null, avatar_url || null, userId, userId]
    )
    
    res.json({ ok: true })
  } catch (error) {
    console.error('>>> ERROR en PUT /perfil:', error)
    res.status(500).json({ error: 'Error interno' })
  }
})

export default r