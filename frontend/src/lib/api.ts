// src/lib/api.ts

// Base de API - FORZADO PARA PRODUCCIÓN
const RAW_BASE = 'https://refugio-de-amor.onrender.com'

// normaliza quitando "/" final
export const BASE = (RAW_BASE || '').replace(/\/+$/, '');

// asegura que el path empiece con "/"
function withSlash(p: string) {
  return p.startsWith('/') ? p : `/${p}`;
}

// fetch con credenciales (cookies) habilitadas
async function apiFetch(path: string, init: RequestInit = {}) {
  const r = await fetch(`${BASE}${withSlash(path)}`, {
    credentials: 'include',
    ...init,
  });
  return r;
}

export const api = {
  // ---------- auth ----------
  async me() {
    const r = await apiFetch('/auth/me');
    return r.ok ? r.json() : null;
  },
  async login(email: string, password: string) {
    const r = await apiFetch('/auth/login', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    
    const data = await r.json();
    
    console.log('Respuesta de login:', data);
    
    if (!r.ok) {
      throw new Error(data.error || 'Error de autenticación');
    }
    
    return data;
  },
  async logout() {
    await apiFetch('/auth/logout', { method: 'POST' });
  },

  // ---------- niveles ----------
  async niveles_list() { const r = await apiFetch('/niveles'); return r.json(); },
  async niveles_create(data: any) {
    const r = await apiFetch('/niveles', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(data) });
    return r.json();
  },
  async niveles_update(id: string, data: any) {
    const r = await apiFetch(`/niveles/${id}`, { method:'PUT', headers:{'content-type':'application/json'}, body:JSON.stringify(data) });
    return r.json();
  },
  async niveles_delete(id: string) { const r = await apiFetch(`/niveles/${id}`, { method:'DELETE' }); return r.json(); },

  // ---------- subniveles ----------
  async subniveles_list() { const r = await apiFetch('/subniveles'); return r.json(); },
  async subniveles_create(data: any) {
    const r = await apiFetch('/subniveles', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(data) });
    return r.json();
  },
  async subniveles_update(id: string, data: any) {
    const r = await apiFetch(`/subniveles/${id}`, { method:'PUT', headers:{'content-type':'application/json'}, body:JSON.stringify(data) });
    return r.json();
  },
  async subniveles_delete(id: string) { const r = await apiFetch(`/subniveles/${id}`, { method:'DELETE' }); return r.json(); },

  // ---------- niños ----------
  async ninos_list(q = '') { const r = await apiFetch(`/ninos?q=${encodeURIComponent(q)}`); return r.json(); },
  async ninos_create(data: any) {
    const r = await apiFetch('/ninos', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(data) });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async ninos_update(id: string, data: any) {
    const r = await apiFetch(`/ninos/${id}`, { method:'PUT', headers:{'content-type':'application/json'}, body:JSON.stringify(data) });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async ninos_delete(id: string) { const r = await apiFetch(`/ninos/${id}`, { method:'DELETE' }); return r.json(); },
  async ninos_get(id: string) { const r = await apiFetch(`/ninos/${id}`); return r.json(); },

  // ---------- usuarios ----------
  async usuarios_list() { const r = await apiFetch('/usuarios'); return r.json(); },
  async usuarios_create(data: any) {
    const r = await apiFetch('/usuarios', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(data) });
    return r.json();
  },
  async usuarios_update(id: string, data: any) {
    const r = await apiFetch(`/usuarios/${id}`, { method:'PUT', headers:{'content-type':'application/json'}, body:JSON.stringify(data) });
    return r.json();
  },
  async usuarios_delete(id: string) { const r = await apiFetch(`/usuarios/${id}`, { method:'DELETE' }); return r.json(); },
  async usuarios_por_rol(role: string) {
    const r = await apiFetch(`/usuarios?role=${encodeURIComponent(role)}`);
    return r.json();
  },

  // ---------- roles / permisos ----------
  async roles_list() { const r = await apiFetch('/roles'); return r.json(); },
  async roles_create(data: any) {
    const r = await apiFetch('/roles', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(data) });
    return r.json();
  },
  async roles_update(id: string, data: any) {
    const r = await apiFetch(`/roles/${id}`, { method:'PUT', headers:{'content-type':'application/json'}, body:JSON.stringify(data) });
    return r.json();
  },
  async roles_delete(id: string) { const r = await apiFetch(`/roles/${id}`, { method:'DELETE' }); return r.json(); },
  async roles_set_perms(id: string, claves: string[]) {
    const r = await apiFetch(`/roles/${id}/permisos`, { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify({claves}) });
    return r.json();
  },
  async permisos_list() { const r = await apiFetch('/permisos'); return r.json(); },

  // ---------- facturas ----------
  async facturas_list() { const r = await apiFetch('/facturas'); return r.json(); },
  async facturas_subir(form: FormData) {
    const r = await apiFetch('/facturas/upload', { method:'POST', body: form });
    return r.json();
  },
  facturas_img(id: string) { return `${BASE}/facturas/${id}/imagen`; },
  async facturas_update(id: string, data: any) {
    const r = await apiFetch(`/facturas/${id}`, { method:'PUT', headers:{'content-type':'application/json'}, body:JSON.stringify(data) });
    return r.json();
  },
  async facturas_delete(id: string) { const r = await apiFetch(`/facturas/${id}`, { method:'DELETE' }); return r.json(); },

  // ---------- perfil ----------
  async perfil_get() {
    const r = await apiFetch('/perfil');
    if (!r.ok) throw new Error('no se pudo cargar el perfil');
    return r.json();
  },
  async perfil_update(data: any) {
    const r = await apiFetch('/perfil', { method:'PUT', headers:{'content-type':'application/json'}, body:JSON.stringify(data) });
    if (!r.ok) throw new Error('no se pudo guardar el perfil');
    return r.json();
  },

  // ---------- asistencia ----------
  async asistencia_list() { const r = await apiFetch('/asistencia'); return r.json(); },
  async asistencia_create(d: any) {
    const r = await apiFetch('/asistencia', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(d || {}) });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async asistencia_editar_load(id: string) {
    const r = await apiFetch(`/asistencia/${id}/editar`);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async asistencia_set_detalles(id: string, items: any[], fecha?: string, hora?: string) {
    const r = await apiFetch(`/asistencia/${id}/detalles`, {
      method:'POST',
      headers:{'content-type':'application/json'},
      body: JSON.stringify({ items, fecha, hora }),
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  asistencia_export_url(id: string, fmt: 'csv' = 'csv') {
    return `${BASE}/asistencia/${id}/export.${fmt}`;
  },
  async asistencia_delete(id: string) {
    const r = await apiFetch(`/asistencia/${id}`, { method:'DELETE' });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },

  // ---------- actividades ----------
  async actividades_list(from: string, to: string) {
    const r = await apiFetch(`/actividades?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`);
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async actividades_create(data: any) {
    const r = await apiFetch('/actividades', { method:'POST', headers:{'content-type':'application/json'}, body:JSON.stringify(data) });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async actividades_update(id: string, data: any) {
    const r = await apiFetch(`/actividades/${id}`, { method:'PUT', headers:{'content-type':'application/json'}, body:JSON.stringify(data) });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async actividades_delete(id: string) {
    const r = await apiFetch(`/actividades/${id}`, { method:'DELETE' });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
};