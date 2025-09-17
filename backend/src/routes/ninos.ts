import { Router } from 'express'
import { pool } from '../core/db'
import { getUserPerms } from '../core/rbac'

const r = Router()

// listar ninos (colabora solo ve los suyos). busca por nombre, apellido o codigo
r.get('/ninos', async (req: any, res: any) => {
  const userId = req.user.id
  const perms = await getUserPerms(userId)
  const qtxt = (req.query.q || '').toString().trim().toLowerCase()
  const soloMios = !(perms.includes('ver_usuarios') || perms.includes('crud_ninos'))

  const sql = `
    select ni.id, ni.codigo, ni.nombres, ni.apellidos,
      (select nombre from niveles where id = ni.nivel_id) as nivel,
      (select nombre from subniveles where id = ni.subnivel_id) as subnivel,
      ni.maestro_id
    from ninos ni
    where ($1 = ''
           or lower(ni.nombres) like '%'||$1||'%'
           or lower(ni.apellidos) like '%'||$1||'%'
           or lower(ni.codigo) like '%'||$1||'%')
      ${soloMios ? 'and ni.maestro_id = $2' : ''}
    order by ni.apellidos, ni.nombres
  `
  const params: any[] = [qtxt]
  if (soloMios) params.push(userId)
  const { rows } = await pool.query(sql, params)
  res.json(rows)
})

// detalle (respeta restriccion de colaborador)
r.get('/ninos/:id', async (req: any, res: any) => {
  const id = req.params.id
  const userId = req.user.id
  const perms = await getUserPerms(userId)
  const soloMios = !(perms.includes('ver_usuarios') || perms.includes('crud_ninos'))

  const { rows } = await pool.query(`
    select ni.*,
      (select nombre from niveles where id = ni.nivel_id) as nivel_nombre,
      (select nombre from subniveles where id = ni.subnivel_id) as subnivel_nombre,
      (select nombres||' '||apellidos from usuarios where id = ni.maestro_id) as maestro_nombre
    from ninos ni
    where ni.id = $1
  `, [id])

  const n = rows[0]
  if (!n) return res.status(404).json({ error: 'no encontrado' })
  if (soloMios && n.maestro_id !== userId) return res.status(403).json({ error: 'no autorizado' })
  res.json(n)
})

// crear (acepta codigo opcional; si viene vacio, trigger lo genera)
r.post('/ninos', async (req: any, res: any) => {
  try {
    const { codigo, nombres, apellidos, fecha_nacimiento, nivel_id, subnivel_id, maestro_id } = req.body
    if (!nombres || !String(nombres).trim() || !apellidos || !String(apellidos).trim()) {
      return res.status(400).json({ error: 'nombres y apellidos requeridos' })
    }
    const hasCodigo = typeof codigo === 'string' && codigo.trim().length > 0

    const q = `
      insert into ninos (${hasCodigo ? 'codigo,' : ''}nombres, apellidos, fecha_nacimiento, nivel_id, subnivel_id, maestro_id)
      values (${hasCodigo ? '$1,' : ''}$${hasCodigo ? 2 : 1}, $${hasCodigo ? 3 : 2}, $${hasCodigo ? 4 : 3}, $${hasCodigo ? 5 : 4}, $${hasCodigo ? 6 : 5}, $${hasCodigo ? 7 : 6})
      returning *
    `
    const params: any[] = []
    if (hasCodigo) params.push(codigo.trim())
    params.push(String(nombres).trim())
    params.push(String(apellidos).trim())
    params.push(fecha_nacimiento || null)
    params.push(nivel_id || null)
    params.push(subnivel_id || null)
    params.push(maestro_id || null)

    const { rows } = await pool.query(q, params)
    res.json(rows[0])
  } catch (e: any) {
    if (e?.code === '23505') return res.status(409).json({ error: 'codigo duplicado' })
    console.error(e)
    res.status(500).json({ error: 'no se pudo crear' })
  }
})

// actualizar (permite cambiar codigo)
r.put('/ninos/:id', async (req: any, res: any) => {
  try {
    const id = req.params.id
    const { codigo, nombres, apellidos, fecha_nacimiento, nivel_id, subnivel_id, maestro_id } = req.body
    const hasCodigo = typeof codigo === 'string'

    const q = `
      update ninos set
        ${hasCodigo ? 'codigo = $1,' : ''}
        nombres = coalesce($${hasCodigo ? 2 : 1}, nombres),
        apellidos = coalesce($${hasCodigo ? 3 : 2}, apellidos),
        fecha_nacimiento = coalesce($${hasCodigo ? 4 : 3}, fecha_nacimiento),
        nivel_id = $${hasCodigo ? 5 : 4},
        subnivel_id = $${hasCodigo ? 6 : 5},
        maestro_id = $${hasCodigo ? 7 : 6},
        modificado_en = now()
      where id = $${hasCodigo ? 8 : 7}
      returning *
    `
    const params: any[] = []
    if (hasCodigo) params.push(codigo && codigo.trim() ? codigo.trim() : '')
    params.push(nombres ?? null)
    params.push(apellidos ?? null)
    params.push(fecha_nacimiento ?? null)
    params.push(nivel_id ?? null)
    params.push(subnivel_id ?? null)
    params.push(maestro_id ?? null)
    params.push(id)

    const { rows } = await pool.query(q, params)
    res.json(rows[0])
  } catch (e: any) {
    if (e?.code === '23505') return res.status(409).json({ error: 'codigo duplicado' })
    console.error(e)
    res.status(500).json({ error: 'no se pudo actualizar' })
  }
})

// eliminar
r.delete('/ninos/:id', async (req: any, res: any) => {
  await pool.query('delete from ninos where id = $1', [req.params.id])
  res.json({ ok: true })
})

export default r
