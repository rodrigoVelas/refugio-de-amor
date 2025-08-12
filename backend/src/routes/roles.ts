import { Router } from 'express'
import { pool } from '../core/db'

const r = Router()

// listar roles con sus permisos
r.get('/roles', async (_req:any, res:any)=>{
  const roles = await pool.query('select id, nombre, codigo from roles order by codigo nulls last, nombre')
  const perms = await pool.query('select id, clave from permisos order by clave')
  const mapa = new Map<string,string[]>()

  const rp = await pool.query(`
    select r.id as role_id, p.clave
    from roles r
    join roles_permisos rp on rp.role_id = r.id
    join permisos p on p.id = rp.permiso_id
  `)
  rp.rows.forEach((x:any)=>{
    const arr = mapa.get(x.role_id) || []
    arr.push(x.clave)
    mapa.set(x.role_id, arr)
  })

  res.json({
    roles: roles.rows.map((r:any)=> ({ ...r, permisos: mapa.get(r.id) || [] })),
    permisos: perms.rows
  })
})

// crear rol (opcional codigo)
r.post('/roles', async (req:any, res:any)=>{
  const { nombre, codigo } = req.body
  if (!nombre || !String(nombre).trim()) return res.status(400).json({ error:'nombre requerido' })
  const { rows } = await pool.query(
    'insert into roles (nombre, codigo) values ($1,$2) returning id, nombre, codigo',
    [nombre.trim(), codigo ?? null]
  )
  res.json(rows[0])
})

// actualizar nombre/codigo
r.put('/roles/:id', async (req:any, res:any)=>{
  const { id } = req.params
  const { nombre, codigo } = req.body
  const { rows } = await pool.query(
    'update roles set nombre=coalesce($1,nombre), codigo=$2, modificado_en=now() where id=$3 returning id, nombre, codigo',
    [nombre ? String(nombre).trim() : null, codigo ?? null, id]
  )
  res.json(rows[0])
})

// eliminar rol (y sus asignaciones)
r.delete('/roles/:id', async (req:any, res:any)=>{
  const { id } = req.params
  await pool.query('delete from usuarios_roles where usuario_id in (select id from usuarios) and role_id=$1', [id])
  await pool.query('delete from roles_permisos where role_id=$1', [id])
  await pool.query('delete from roles where id=$1', [id])
  res.json({ ok:true })
})

// setear permisos de un rol (reemplaza todo)
r.post('/roles/:id/permisos', async (req:any, res:any)=>{
  const { id } = req.params
  const { claves } = req.body as { claves: string[] }
  await pool.query('begin')
  try{
    await pool.query('delete from roles_permisos where role_id=$1', [id])
    if (Array.isArray(claves) && claves.length){
      const ins = await pool.query(
        'insert into roles_permisos (role_id, permiso_id) select $1, p.id from permisos p where p.clave = any($2::text[]) returning *',
        [id, claves]
      )
      await pool.query('commit')
      return res.json({ ok:true, agregados: ins.rowCount })
    }else{
      await pool.query('commit')
      return res.json({ ok:true, agregados: 0 })
    }
  }catch(e){
    await pool.query('rollback')
    throw e
  }
})

// listar todos los permisos
r.get('/permisos', async (_req:any, res:any)=>{
  const { rows } = await pool.query('select id, clave from permisos order by clave')
  res.json(rows)
})

export default r
