import { Router } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { pool } from '../core/db'
import { getUserPerms } from '../core/rbac'

const r = Router()

// storage carpeta
const dir = path.resolve(process.cwd(), 'uploads', 'facturas')
fs.mkdirSync(dir, { recursive: true })

const storage = multer.diskStorage({
  destination: (_req, _file, cb)=> cb(null, dir),
  filename: (_req, file, cb)=> {
    const ts = Date.now()
    const safe = file.originalname.replace(/[^\w.\-]+/g,'_').toLowerCase()
    cb(null, `${ts}-${safe}`)
  }
})
const upload = multer({ storage })

// listar facturas (segun permisos)
r.get('/facturas', async (req:any, res:any)=>{
  const userId = req.user.id
  const perms = await getUserPerms(userId)
  const verTodas = perms.includes('facturas_ver_todas')
  const sql = verTodas
    ? `select f.*, u.email from facturas f join usuarios u on u.id=f.usuario_id order by f.creado_en desc limit 500`
    : `select f.*, u.email from facturas f join usuarios u on u.id=f.usuario_id where f.usuario_id=$1 order by f.creado_en desc limit 500`
  const params:any[] = verTodas ? [] : [userId]
  const { rows } = await pool.query(sql, params)
  res.json(rows)
})

// subir factura (solo colaboradores y quien tenga facturas_subir)
r.post('/facturas/upload', upload.single('imagen'), async (req:any, res:any)=>{
  const userId = req.user.id
  const perms = await getUserPerms(userId)
  if (!perms.includes('facturas_subir')) return res.status(403).json({ error:'no autorizado' })
  if (!req.file) return res.status(400).json({ error:'imagen requerida' })

  const { descripcion, total, fecha } = req.body
  const { path: p, mimetype } = req.file
  const rel = p.replace(path.resolve(process.cwd())+path.sep, '') // guardar ruta relativa

  const { rows } = await pool.query(`
    insert into facturas (usuario_id, descripcion, imagen_path, imagen_mime, total, fecha)
    values ($1,$2,$3,$4,$5,$6) returning *
  `,[userId, descripcion||null, rel, mimetype, total?Number(total):null, fecha||null])

  res.json(rows[0])
})

// descargar/ver imagen (stream)
r.get('/facturas/:id/imagen', async (req:any, res:any)=>{
  const userId = req.user.id
  const perms = await getUserPerms(userId)
  const { rows } = await pool.query('select * from facturas where id=$1',[req.params.id])
  const f = rows[0]; if(!f) return res.status(404).end()
  const esPropia = f.usuario_id === userId
  if (!(perms.includes('facturas_ver_todas') || esPropia)) return res.status(403).json({ error:'no autorizado' })

  const abs = path.resolve(process.cwd(), f.imagen_path)
  if (!fs.existsSync(abs)) return res.status(404).json({ error:'archivo no existe' })
  res.setHeader('content-type', f.imagen_mime || 'application/octet-stream')
  fs.createReadStream(abs).pipe(res)
})

// actualizar descripcion/total/fecha (solo dueño)
r.put('/facturas/:id', async (req:any, res:any)=>{
  const userId = req.user.id
  const { rows } = await pool.query('select * from facturas where id=$1',[req.params.id])
  const f = rows[0]; if(!f) return res.status(404).end()
  if (f.usuario_id !== userId) return res.status(403).json({ error:'no autorizado' })

  const { descripcion, total, fecha } = req.body
  const q = `
    update facturas set
      descripcion = coalesce($1, descripcion),
      total = $2,
      fecha = coalesce($3, fecha),
      modificado_en = now()
    where id = $4
    returning *
  `
  const u = await pool.query(q, [descripcion ?? null, total!=null?Number(total):f.total, fecha ?? f.fecha, req.params.id])
  res.json(u.rows[0])
})

// eliminar (solo dueño)
r.delete('/facturas/:id', async (req:any, res:any)=>{
  const userId = req.user.id
  const { rows } = await pool.query('select * from facturas where id=$1',[req.params.id])
  const f = rows[0]; if(!f) return res.status(404).end()
  if (f.usuario_id !== userId) return res.status(403).json({ error:'no autorizado' })

  // borrar archivo fisico
  const abs = f.imagen_path ? path.resolve(process.cwd(), f.imagen_path) : ''
  try{ if (abs && fs.existsSync(abs)) fs.unlinkSync(abs) }catch{}
  await pool.query('delete from facturas where id=$1',[req.params.id])
  res.json({ ok:true })
})

export default r
