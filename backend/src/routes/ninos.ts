import { Router } from 'express'
import { pool } from '../core/db'

const r = Router()

// listar con busqueda simple por q (solo codigo, nombres, apellidos)
r.get('/ninos', async (req: any, res) => {
  const q = (req.query.q || '').toString().trim()
  const params: any[] = []
  let where = ''
  if (q) {
    params.push(`%${q.toLowerCase()}%`)
    where = `
      where
        lower(nombres) like $1 or
        lower(apellidos) like $1 or
        lower(codigo) like $1
    `
  }

  const sql = `
    select
      id, codigo, nombres, apellidos, fecha_nacimiento,
      nivel_id, subnivel_id, maestro_id,
      nombre_encargado, telefono_encargado, direccion_encargado,
      creado_en, modificado_en
    from ninos
    ${where}
    order by apellidos asc, nombres asc
    limit 1000
  `
  const { rows } = await pool.query(sql, params)
  res.json(rows)
})

// obtener uno
r.get('/ninos/:id', async (req, res) => {
  const { id } = req.params
  const { rows } = await pool.query(
    `select
        id, codigo, nombres, apellidos, fecha_nacimiento,
        nivel_id, subnivel_id, maestro_id,
        nombre_encargado, telefono_encargado, direccion_encargado,
        creado_en, modificado_en
     from ninos where id=$1`,
    [id]
  )
  if (!rows[0]) return res.status(404).send('no encontrado')
  res.json(rows[0])
})

// crear
// crear
r.post('/ninos', async (req: any, res) => {
  const b = req.body || {}
  if (!b.nombres || !b.apellidos) return res.status(400).send('nombres y apellidos requeridos')

  const codigo = (b.codigo || '').toString().trim()
  if (!codigo) return res.status(400).send('codigo requerido')

  const sql = `
    insert into ninos (
      codigo, nombres, apellidos, fecha_nacimiento,
      nivel_id, subnivel_id, maestro_id,
      nombre_encargado, telefono_encargado, direccion_encargado,
      creado_en, modificado_en
    ) values (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10, now(), now()
    )
    returning
      id, codigo, nombres, apellidos, fecha_nacimiento,
      nivel_id, subnivel_id, maestro_id,
      nombre_encargado, telefono_encargado, direccion_encargado,
      creado_en, modificado_en
  `
  const params = [
    codigo,
    b.nombres?.trim(),
    b.apellidos?.trim(),
    b.fecha_nacimiento || null,
    b.nivel_id || null,
    b.subnivel_id || null,
    b.maestro_id || null,
    (b.nombre_encargado || '').trim(),
    (b.telefono_encargado || '').trim(),
    (b.direccion_encargado || '').trim(),
  ]
  try{
    const { rows } = await pool.query(sql, params)
    res.json(rows[0])
  }catch(e:any){
    if (e.code === '23505') return res.status(409).send('codigo ya existe')
    throw e
  }
})


// actualizar
r.put('/ninos/:id', async (req, res) => {
  const { id } = req.params
  const b = req.body || {}

  const codigo = (b.codigo || '').toString().trim()
  if (!codigo) return res.status(400).send('codigo requerido')

  const sql = `
    update ninos set
      codigo = $1,
      nombres = $2,
      apellidos = $3,
      fecha_nacimiento = $4,
      nivel_id = $5,
      subnivel_id = $6,
      maestro_id = $7,
      nombre_encargado = $8,
      telefono_encargado = $9,
      direccion_encargado = $10,
      modificado_en = now()
    where id = $11
    returning
      id, codigo, nombres, apellidos, fecha_nacimiento,
      nivel_id, subnivel_id, maestro_id,
      nombre_encargado, telefono_encargado, direccion_encargado,
      creado_en, modificado_en
  `
  const params = [
    codigo,
    b.nombres?.trim(),
    b.apellidos?.trim(),
    b.fecha_nacimiento || null,
    b.nivel_id || null,
    b.subnivel_id || null,
    b.maestro_id || null,
    (b.nombre_encargado || '').trim(),
    (b.telefono_encargado || '').trim(),
    (b.direccion_encargado || '').trim(),
    id
  ]
  try{
    const { rows } = await pool.query(sql, params)
    res.json(rows[0])
  }catch(e:any){
    if (e.code === '23505') return res.status(409).send('codigo ya existe')
    throw e
  }
})


// eliminar
r.delete('/ninos/:id', async (req, res) => {
  const { id } = req.params
  await pool.query('delete from ninos where id=$1', [id])
  res.json({ ok: true })
})

export default r
