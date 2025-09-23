export const api = {
  // auth
  async me(){
    const r = await fetch('http://localhost:3000/auth/me', { credentials:'include' })
    return r.ok ? r.json() : null
  },
  async login(email: string, password: string){
    const r = await fetch('http://localhost:3000/auth/login', {
      method:'POST',
      credentials:'include',
      headers:{ 'content-type':'application/json' },
      body: JSON.stringify({ email, password })
    })
    if (!r.ok) throw new Error('login')
    return r.json()
  },
  async logout(){
    await fetch('http://localhost:3000/auth/logout', { method:'POST', credentials:'include' })
  },

  // niveles
  async niveles_list(){ const r = await fetch('http://localhost:3000/niveles', { credentials:'include' }); return r.json() },
  async niveles_create(data:any){ const r = await fetch('http://localhost:3000/niveles', { method:'POST', credentials:'include', headers:{ 'content-type':'application/json' }, body: JSON.stringify(data) }); return r.json() },
  async niveles_update(id:string, data:any){ const r = await fetch('http://localhost:3000/niveles/'+id, { method:'PUT', credentials:'include', headers:{ 'content-type':'application/json' }, body: JSON.stringify(data) }); return r.json() },
  async niveles_delete(id:string){ const r = await fetch('http://localhost:3000/niveles/'+id, { method:'DELETE', credentials:'include' }); return r.json() },

  // subniveles
  async subniveles_list(){ const r = await fetch('http://localhost:3000/subniveles', { credentials:'include' }); return r.json() },
  async subniveles_create(data:any){ const r = await fetch('http://localhost:3000/subniveles', { method:'POST', credentials:'include', headers:{ 'content-type':'application/json' }, body: JSON.stringify(data) }); return r.json() },
  async subniveles_update(id:string, data:any){ const r = await fetch('http://localhost:3000/subniveles/'+id, { method:'PUT', credentials:'include', headers:{ 'content-type':'application/json' }, body: JSON.stringify(data) }); return r.json() },
  async subniveles_delete(id:string){ const r = await fetch('http://localhost:3000/subniveles/'+id, { method:'DELETE', credentials:'include' }); return r.json() },

  // ninos
  async ninos_list(q = ''){ const r = await fetch('http://localhost:3000/ninos?q='+encodeURIComponent(q), { credentials:'include' }); return r.json() },
  async ninos_create(data:any){
    const r = await fetch('http://localhost:3000/ninos', { method:'POST', credentials:'include', headers:{ 'content-type':'application/json' }, body: JSON.stringify(data) })
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  },
  async ninos_update(id:string, data:any){
    const r = await fetch('http://localhost:3000/ninos/'+id, { method:'PUT', credentials:'include', headers:{ 'content-type':'application/json' }, body: JSON.stringify(data) })
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  },
  async ninos_delete(id:string){ const r = await fetch('http://localhost:3000/ninos/'+id, { method:'DELETE', credentials:'include' }); return r.json() },
  async ninos_get(id:string){ const r = await fetch('http://localhost:3000/ninos/'+id, { credentials:'include' }); return r.json() },

  // usuarios
  async usuarios_list(){ const r = await fetch('http://localhost:3000/usuarios', { credentials:'include' }); return r.json() },
  async usuarios_create(data:any){ const r = await fetch('http://localhost:3000/usuarios', { method:'POST', credentials:'include', headers:{ 'content-type':'application/json' }, body: JSON.stringify(data) }); return r.json() },
  async usuarios_update(id:string, data:any){ const r = await fetch('http://localhost:3000/usuarios/'+id, { method:'PUT', credentials:'include', headers:{ 'content-type':'application/json' }, body: JSON.stringify(data) }); return r.json() },
  async usuarios_delete(id:string){ const r = await fetch('http://localhost:3000/usuarios/'+id, { method:'DELETE', credentials:'include' }); return r.json() },
  async usuarios_por_rol(role:string){ const r = await fetch('http://localhost:3000/usuarios?role='+encodeURIComponent(role), { credentials:'include' }); return r.json() },

  // roles y permisos
  async roles_list(){ const r = await fetch('http://localhost:3000/roles', { credentials:'include' }); return r.json() },
  async roles_create(data:any){ const r = await fetch('http://localhost:3000/roles', { method:'POST', credentials:'include', headers:{ 'content-type':'application/json' }, body: JSON.stringify(data) }); return r.json() },
  async roles_update(id:string, data:any){ const r = await fetch('http://localhost:3000/roles/'+id, { method:'PUT', credentials:'include', headers:{ 'content-type':'application/json' }, body: JSON.stringify(data) }); return r.json() },
  async roles_delete(id:string){ const r = await fetch('http://localhost:3000/roles/'+id, { method:'DELETE', credentials:'include' }); return r.json() },
  async roles_set_perms(id:string, claves:string[]){ const r = await fetch(`http://localhost:3000/roles/${id}/permisos`, { method:'POST', credentials:'include', headers:{ 'content-type':'application/json' }, body: JSON.stringify({ claves }) }); return r.json() },
  async permisos_list(){ const r = await fetch('http://localhost:3000/permisos', { credentials:'include' }); return r.json() },

  // facturas
  async facturas_list(){ const r = await fetch('http://localhost:3000/facturas', { credentials:'include' }); return r.json() },
  async facturas_subir(form: FormData){ const r = await fetch('http://localhost:3000/facturas/upload', { method:'POST', credentials:'include', body: form }); return r.json() },
  async facturas_img(id:string){ return `http://localhost:3000/facturas/${id}/imagen` },
  async facturas_update(id:string, data:any){ const r = await fetch('http://localhost:3000/facturas/'+id, { method:'PUT', credentials:'include', headers:{ 'content-type':'application/json' }, body: JSON.stringify(data) }); return r.json() },
  async facturas_delete(id:string){ const r = await fetch('http://localhost:3000/facturas/'+id, { method:'DELETE', credentials:'include' }); return r.json() },

  // perfil
  async perfil_get(){
    const r = await fetch('http://localhost:3000/perfil', { credentials:'include' })
    if (!r.ok) throw new Error('no se pudo cargar el perfil')
    return r.json()
  },
  async perfil_update(data:any){
    const r = await fetch('http://localhost:3000/perfil', {
      method:'PUT',
      credentials:'include',
      headers:{ 'content-type':'application/json' },
      body: JSON.stringify(data)
    })
    if (!r.ok) throw new Error('no se pudo guardar el perfil')
    return r.json()
  },

// asistencia
async asistencia_list(){ 
  const r = await fetch('http://localhost:3000/asistencia', { credentials:'include' })
  return r.json()
},
async asistencia_create(d:any){
  const r = await fetch('http://localhost:3000/asistencia', {
    method:'POST',
    credentials:'include',
    headers:{ 'content-type':'application/json' },
    body: JSON.stringify(d || {})
  })
  if(!r.ok) throw new Error(await r.text())
  return r.json()
},
async asistencia_editar_load(id:string){
  const r = await fetch(`http://localhost:3000/asistencia/${id}/editar`, { credentials:'include' })
  if(!r.ok) throw new Error(await r.text())
  return r.json()
},
async asistencia_set_detalles(id:string, items:any[], fecha?:string, hora?:string){
  const r = await fetch(`http://localhost:3000/asistencia/${id}/detalles`, {
    method:'POST',
    credentials:'include',
    headers:{ 'content-type':'application/json' },
    body: JSON.stringify({ items, fecha, hora })
  })
  if(!r.ok) throw new Error(await r.text())
  return r.json()
},


  // actividades
  async actividades_list(from: string, to: string){
    const r = await fetch(`http://localhost:3000/actividades?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, { credentials:'include' })
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  },
  async actividades_create(data:any){
    const r = await fetch('http://localhost:3000/actividades', {
      method:'POST',
      credentials:'include',
      headers:{ 'content-type':'application/json' },
      body: JSON.stringify(data)
    })
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  },
  async actividades_update(id:string, data:any){
    const r = await fetch(`http://localhost:3000/actividades/${id}`, {
      method:'PUT',
      credentials:'include',
      headers:{ 'content-type':'application/json' },
      body: JSON.stringify(data)
    })
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  },
  async actividades_delete(id:string){
    const r = await fetch(`http://localhost:3000/actividades/${id}`, { method:'DELETE', credentials:'include' })
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  },
  // asistencia export
asistencia_export_url(id:string, fmt:'csv'='csv'){
  return `http://localhost:3000/asistencia/${id}/export.${fmt}`
},
async asistencia_delete(id:string){
  const r = await fetch(`http://localhost:3000/asistencia/${id}`, {
    method:'DELETE',
    credentials:'include'
  })
  if(!r.ok) throw new Error(await r.text())
  return r.json()
},

}
