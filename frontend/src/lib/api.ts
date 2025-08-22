export const api = {
  async me(){ const r = await fetch('http://localhost:3000/auth/me', { credentials:'include' }); return r.ok ? r.json() : null },
  async login(email:string, password:string){ const r = await fetch('http://localhost:3000/auth/login',{ method:'POST', credentials:'include', headers:{'content-type':'application/json'}, body: JSON.stringify({ email, password })}); if(!r.ok) throw new Error('login'); return r.json() },
  async logout(){ await fetch('http://localhost:3000/auth/logout', { method:'POST', credentials:'include' }) },
  async niveles_list(){ const r=await fetch('http://localhost:3000/niveles',{credentials:'include'}); return r.json() },
  async niveles_create(data:any){ const r=await fetch('http://localhost:3000/niveles',{method:'POST',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify(data)}); return r.json() },
  async niveles_update(id:string,data:any){ const r=await fetch('http://localhost:3000/niveles/'+id,{method:'PUT',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify(data)}); return r.json() },
  async niveles_delete(id:string){ const r=await fetch('http://localhost:3000/niveles/'+id,{method:'DELETE',credentials:'include'}); return r.json() },
  async subniveles_list(){ const r=await fetch('http://localhost:3000/subniveles',{credentials:'include'}); return r.json() },
  async subniveles_create(data:any){ const r=await fetch('http://localhost:3000/subniveles',{method:'POST',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify(data)}); return r.json() },
  async subniveles_update(id:string,data:any){ const r=await fetch('http://localhost:3000/subniveles/'+id,{method:'PUT',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify(data)}); return r.json() },
  async subniveles_delete(id:string){ const r=await fetch('http://localhost:3000/subniveles/'+id,{method:'DELETE',credentials:'include'}); return r.json() },
  async ninos_list(q=''){ const r=await fetch('http://localhost:3000/ninos?q='+encodeURIComponent(q),{credentials:'include'}); return r.json() },
  async ninos_create(data:any){ const r=await fetch('http://localhost:3000/ninos',{method:'POST',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify(data)}); return r.json() },
  async ninos_update(id:string,data:any){ const r=await fetch('http://localhost:3000/ninos/'+id,{method:'PUT',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify(data)}); return r.json() },
  async ninos_delete(id:string){ const r=await fetch('http://localhost:3000/ninos/'+id,{method:'DELETE',credentials:'include'}); return r.json() },
  async usuarios_list(){ const r=await fetch('http://localhost:3000/usuarios',{credentials:'include'}); return r.json() },
  async usuarios_create(data:any){ const r=await fetch('http://localhost:3000/usuarios',{method:'POST',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify(data)}); return r.json() },
  async usuarios_update(id:string,data:any){ const r=await fetch('http://localhost:3000/usuarios/'+id,{method:'PUT',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify(data)}); return r.json() },
  async usuarios_delete(id:string){ const r=await fetch('http://localhost:3000/usuarios/'+id,{method:'DELETE',credentials:'include'}); return r.json() },
  // roles y permisos
  async roles_list(){ const r=await fetch('http://localhost:3000/roles',{credentials:'include'}); return r.json() },
  async roles_create(data:any){ const r=await fetch('http://localhost:3000/roles',{method:'POST',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify(data)}); return r.json() },
  async roles_update(id:string,data:any){ const r=await fetch('http://localhost:3000/roles/'+id,{method:'PUT',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify(data)}); return r.json() },
  async roles_delete(id:string){ const r=await fetch('http://localhost:3000/roles/'+id,{method:'DELETE',credentials:'include'}); return r.json() },
  async roles_set_perms(id:string, claves:string[]){ const r=await fetch(`http://localhost:3000/roles/${id}/permisos`,{method:'POST',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify({claves})}); return r.json() },
  async permisos_list(){ const r=await fetch('http://localhost:3000/permisos',{credentials:'include'}); return r.json() },
  // facturas
  async facturas_list(){ const r=await fetch('http://localhost:3000/facturas',{credentials:'include'}); return r.json() },
  async facturas_subir(form:FormData){ const r=await fetch('http://localhost:3000/facturas/upload',{method:'POST',credentials:'include',body:form}); return r.json() },
  async facturas_img(id:string){ return `http://localhost:3000/facturas/${id}/imagen` },
  async facturas_update(id:string,data:any){ const r=await fetch('http://localhost:3000/facturas/'+id,{method:'PUT',credentials:'include',headers:{'content-type':'application/json'},body:JSON.stringify(data)}); return r.json() },
  async facturas_delete(id:string){ const r=await fetch('http://localhost:3000/facturas/'+id,{method:'DELETE',credentials:'include'}); return r.json() },


  // al final del objeto api:
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

  // usuarios por rol (para el select de maestro)
  async usuarios_por_rol(role:string){
    const r = await fetch('http://localhost:3000/usuarios?role='+encodeURIComponent(role), { credentials:'include' })
    return r.json()
  },
  // detalle de nino
  async ninos_get(id:string){
    const r = await fetch('http://localhost:3000/ninos/'+id, { credentials:'include' })
    return r.json()
  },


}

