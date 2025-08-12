import { Router } from 'express'
import { pool } from '../core/db'
const r = Router()
import { getUserPerms } from '../core/rbac'

r.get('/ninos', async (req:any, res:any)=>{
  const userId = req.user.id
  const perms = await getUserPerms(userId)
  const qtxt = (req.query.q || '').toString().trim().toLowerCase()

  // si NO tiene permisos "admin" (ej: ver_usuarios o crud_ninos), solo ve los suyos
  const soloMios = !(perms.includes('ver_usuarios') || perms.includes('crud_ninos'))

  const sql = `
    select ni.id, ni.nombres, ni.apellidos,
      (select nombre from niveles where id=ni.nivel_id) as nivel,
      (select nombre from subniveles where id=ni.subnivel_id) as subnivel,
      ni.maestro_id
    from ninos ni
    where ($1='' or lower(ni.nombres) like '%'||$1||'%' or lower(ni.apellidos) like '%'||$1||'%')
      ${soloMios ? 'and ni.maestro_id = $2' : ''}
    order by ni.apellidos, ni.nombres
  `
  const params:any[] = [qtxt]
  if (soloMios) params.push(userId)
  const { rows } = await pool.query(sql, params)
  res.json(rows)
})

r.get('/ninos/:id', async (req:any, res:any)=>{
  const id = req.params.id
  const userId = req.user.id
  const perms = await getUserPerms(userId)
  const soloMios = !(perms.includes('ver_usuarios') || perms.includes('crud_ninos'))

  const { rows } = await pool.query(`
    select ni.*,
      (select nombre from niveles where id=ni.nivel_id) as nivel_nombre,
      (select nombre from subniveles where id=ni.subnivel_id) as subnivel_nombre,
      (select nombres||' '||apellidos from usuarios where id=ni.maestro_id) as maestro_nombre
    from ninos ni
    where ni.id=$1
  `,[id])
  const n = rows[0]
  if (!n) return res.status(404).json({ error:'no encontrado' })
  if (soloMios && n.maestro_id !== userId) return res.status(403).json({ error:'no autorizado' })
  res.json(n)
})


r.get('/ninos', async (req:any, res:any)=>{
  const q = (req.query.q || '').toString().trim().toLowerCase()
  const sql = `
    select ni.id, ni.nombres, ni.apellidos,
      (select nombre from niveles where id=ni.nivel_id) as nivel,
      (select nombre from subniveles where id=ni.subnivel_id) as subnivel
    from ninos ni
    where ($1='' or lower(ni.nombres) like '%'||$1||'%' or lower(ni.apellidos) like '%'||$1||'%')
    order by ni.apellidos, ni.nombres
  `
  const { rows } = await pool.query(sql, [q])
  res.json(rows)
})

r.post('/ninos', async (req:any, res:any)=>{
  const { nombres, apellidos, fecha_nacimiento, nivel_id, subnivel_id, maestro_id } = req.body
  const { rows } = await pool.query(`
    insert into ninos (nombres, apellidos, fecha_nacimiento, nivel_id, subnivel_id, maestro_id)
    values ($1,$2,$3,$4,$5,$6) returning *
  `,[nombres, apellidos, fecha_nacimiento, nivel_id||null, subnivel_id||null, maestro_id||null])
  res.json(rows[0])
})

r.put('/ninos/:id', async (req:any, res:any)=>{
  const { id } = req.params
  const { nombres, apellidos, fecha_nacimiento, nivel_id, subnivel_id, maestro_id, activo } = req.body
  const { rows } = await pool.query(`
    update ninos set
      nombres=coalesce($1,nombres), apellidos=coalesce($2,apellidos),
      fecha_nacimiento=coalesce($3,fecha_nacimiento),
      nivel_id=coalesce($4,nivel_id), subnivel_id=coalesce($5,subnivel_id),
      maestro_id=coalesce($6,maestro_id), activo=coalesce($7,activo),
      modificado_en=now()
    where id=$8 returning *
  `,[nombres, apellidos, fecha_nacimiento, nivel_id, subnivel_id, maestro_id, activo, id])
  res.json(rows[0])
})

r.delete('/ninos/:id', async (req:any, res:any)=>{
  const { id } = req.params
  await pool.query('delete from ninos where id=$1',[id])
  res.json({ ok:true })
})


export default r
