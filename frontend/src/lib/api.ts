// src/lib/api.ts

// FORZAR evaluación en runtime con getter
let cachedBase: string | null = null

function getBase(): string {
  // Solo cachear en el navegador después de la primera llamada
  if (typeof window === 'undefined') {
    return 'https://refugio-de-amor.onrender.com'
  }
  
  // No cachear, siempre evaluar
  const hostname = window.location.hostname
  
  console.log('🔍 Detectando hostname:', hostname) // Debug
  
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    console.log('✅ Usando localhost:3000')
    return 'http://localhost:3000'
  }
  
  console.log('✅ Usando Render:', 'https://refugio-de-amor.onrender.com')
  return 'https://refugio-de-amor.onrender.com'
}

// Export como getter
export const BASE = getBase()
export const baseURL = BASE // Alias para compatibilidad

// asegura que el path empiece con "/"
function withSlash(p: string) {
  return p.startsWith('/') ? p : `/${p}`;
}

// fetch con credenciales (cookies) habilitadas
async function apiFetch(path: string, init: RequestInit = {}) {
  // SIEMPRE llamar a getBase() para cada petición
  const baseUrl = getBase()
  console.log('🌐 API call a:', `${baseUrl}${withSlash(path)}`) // Debug
  
  const r = await fetch(`${baseUrl}${withSlash(path)}`, {
    credentials: 'include',
    ...init,
  });
  return r;
}

// Función auxiliar para manejar respuestas con errores
async function handleResponse(response: Response) {
  if (!response.ok) {
    let error;
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        error = await response.json();
      } else {
        const text = await response.text();
        error = { message: text || `Error ${response.status}` };
      }
    } catch {
      error = { message: `Error ${response.status}` };
    }
    
    // Crear un error con información adicional
    const errorMessage = error.message || error.error || `Error ${response.status}`;
    const err = new Error(errorMessage) as any;
    err.status = response.status;
    err.details = error;
    throw err;
  }
  
  // Si la respuesta es exitosa, intentar parsear JSON
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  
  // Si no es JSON, devolver el texto
  return response.text();
}

export const api = {
  // Exponer baseURL para compatibilidad
  baseURL: BASE,
  
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
  async niveles_list() { 
    const r = await apiFetch('/niveles'); 
    return r.json(); 
  },
  async niveles_create(data: any) {
    const r = await apiFetch('/niveles', { 
      method:'POST', 
      headers:{'content-type':'application/json'}, 
      body:JSON.stringify(data) 
    });
    return r.json();
  },
  async niveles_update(id: string, data: any) {
    const r = await apiFetch(`/niveles/${id}`, { 
      method:'PUT', 
      headers:{'content-type':'application/json'}, 
      body:JSON.stringify(data) 
    });
    return r.json();
  },
  async niveles_delete(id: string) { 
    const r = await apiFetch(`/niveles/${id}`, { method:'DELETE' }); 
    return r.json(); 
  },

  // ---------- subniveles ----------
  async subniveles_list() { 
    const r = await apiFetch('/subniveles'); 
    return r.json(); 
  },
  async subniveles_create(data: any) {
    const r = await apiFetch('/subniveles', { 
      method:'POST', 
      headers:{'content-type':'application/json'}, 
      body:JSON.stringify(data) 
    });
    return r.json();
  },
  async subniveles_update(id: string, data: any) {
    const r = await apiFetch(`/subniveles/${id}`, { 
      method:'PUT', 
      headers:{'content-type':'application/json'}, 
      body:JSON.stringify(data) 
    });
    return r.json();
  },
  async subniveles_delete(id: string) { 
    const r = await apiFetch(`/subniveles/${id}`, { method:'DELETE' }); 
    return r.json(); 
  },

  // ---------- niños (ACTUALIZADO CON NUEVAS FUNCIONES) ----------
  async ninos_list(q = '', incluirInactivos = false) { 
    const params = new URLSearchParams();
    if (q) params.append('q', q);
    if (incluirInactivos) params.append('incluirInactivos', 'true');
    
    const r = await apiFetch(`/ninos?${params.toString()}`); 
    return r.json(); 
  },
  
  async ninos_create(data: any) {
    const r = await apiFetch('/ninos', { 
      method:'POST', 
      headers:{'content-type':'application/json'}, 
      body:JSON.stringify(data) 
    });
    return handleResponse(r);
  },
  
  async ninos_update(id: string, data: any) {
    const r = await apiFetch(`/ninos/${id}`, { 
      method:'PUT', 
      headers:{'content-type':'application/json'}, 
      body:JSON.stringify(data) 
    });
    return handleResponse(r);
  },
  
  async ninos_delete(id: string, forzar = false) { 
    const params = forzar ? '?forzar=true' : '';
    const r = await apiFetch(`/ninos/${id}${params}`, { method:'DELETE' }); 
    
    // Manejo especial para error 409 (conflicto de clave foránea)
    if (r.status === 409) {
      const error = await r.json();
      const err = new Error(error.message || 'Existen registros relacionados') as any;
      err.status = 409;
      err.details = error;
      throw err;
    }
    
    return handleResponse(r);
  },
  
  async ninos_get(id: string) { 
    const r = await apiFetch(`/ninos/${id}`); 
    return r.json(); 
  },
  
  // NUEVAS FUNCIONES para soft delete y dependencias
  async ninos_desactivar(id: string) {
    const r = await apiFetch(`/ninos/${id}/desactivar`, { 
      method: 'PUT',
      headers: { 'content-type': 'application/json' }
    });
    return handleResponse(r);
  },
  
  async ninos_reactivar(id: string) {
    const r = await apiFetch(`/ninos/${id}/reactivar`, { 
      method: 'PUT',
      headers: { 'content-type': 'application/json' }
    });
    return handleResponse(r);
  },
  
  async ninos_verificar_dependencias(id: string) {
    const r = await apiFetch(`/ninos/${id}/dependencias`);
    return handleResponse(r);
  },

  // ---------- usuarios ----------
  async usuarios_list() { 
    const r = await apiFetch('/usuarios'); 
    return r.json(); 
  },
  async usuarios_create(data: any) {
    const r = await apiFetch('/usuarios', { 
      method:'POST', 
      headers:{'content-type':'application/json'}, 
      body:JSON.stringify(data) 
    });
    return r.json();
  },
  async usuarios_update(id: string, data: any) {
    const r = await apiFetch(`/usuarios/${id}`, { 
      method:'PUT', 
      headers:{'content-type':'application/json'}, 
      body:JSON.stringify(data) 
    });
    return r.json();
  },
  async usuarios_delete(id: string) { 
    const r = await apiFetch(`/usuarios/${id}`, { method:'DELETE' }); 
    return r.json(); 
  },
  async usuarios_por_rol(role: string) {
    const r = await apiFetch(`/usuarios?role=${encodeURIComponent(role)}`);
    return r.json();
  },

  // ---------- roles / permisos ----------
  async roles_list() { 
    const r = await apiFetch('/roles'); 
    return r.json(); 
  },
  async roles_create(data: any) {
    const r = await apiFetch('/roles', { 
      method:'POST', 
      headers:{'content-type':'application/json'}, 
      body:JSON.stringify(data) 
    });
    return r.json();
  },
  async roles_update(id: string, data: any) {
    const r = await apiFetch(`/roles/${id}`, { 
      method:'PUT', 
      headers:{'content-type':'application/json'}, 
      body:JSON.stringify(data) 
    });
    return r.json();
  },
  async roles_delete(id: string) { 
    const r = await apiFetch(`/roles/${id}`, { method:'DELETE' }); 
    return r.json(); 
  },
  async roles_set_perms(id: string, claves: string[]) {
    const r = await apiFetch(`/roles/${id}/permisos`, { 
      method:'POST', 
      headers:{'content-type':'application/json'}, 
      body:JSON.stringify({claves}) 
    });
    return r.json();
  },
  async permisos_list() { 
    const r = await apiFetch('/permisos'); 
    return r.json(); 
  },

  // ---------- facturas ----------
  async facturas_list() { 
    const r = await apiFetch('/facturas'); 
    return r.json(); 
  },
  async facturas_subir(form: FormData) {
    const r = await apiFetch('/facturas/upload', { method:'POST', body: form });
    return r.json();
  },
  facturas_img(id: string) { 
    return `${getBase()}/facturas/${id}/imagen`; 
  },
  async facturas_update(id: string, data: any) {
    const r = await apiFetch(`/facturas/${id}`, { 
      method:'PUT', 
      headers:{'content-type':'application/json'}, 
      body:JSON.stringify(data) 
    });
    return r.json();
  },
  async facturas_delete(id: string) { 
    const r = await apiFetch(`/facturas/${id}`, { method:'DELETE' }); 
    return r.json(); 
  },

  // ---------- perfil ----------
  async perfil_get() {
    const r = await apiFetch('/perfil');
    if (!r.ok) throw new Error('no se pudo cargar el perfil');
    return r.json();
  },
  async perfil_update(data: any) {
    const r = await apiFetch('/perfil', { 
      method:'PUT', 
      headers:{'content-type':'application/json'}, 
      body:JSON.stringify(data) 
    });
    if (!r.ok) throw new Error('no se pudo guardar el perfil');
    return r.json();
  },

  // ---------- asistencia ----------
  async asistencia_list() { 
    const r = await apiFetch('/asistencia'); 
    return r.json(); 
  },
  async asistencia_create(d: any) {
    const r = await apiFetch('/asistencia', { 
      method:'POST', 
      headers:{'content-type':'application/json'}, 
      body:JSON.stringify(d || {}) 
    });
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
    return `${getBase()}/asistencia/${id}/export.${fmt}`;
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
    const r = await apiFetch('/actividades', { 
      method:'POST', 
      headers:{'content-type':'application/json'}, 
      body:JSON.stringify(data) 
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async actividades_update(id: string, data: any) {
    const r = await apiFetch(`/actividades/${id}`, { 
      method:'PUT', 
      headers:{'content-type':'application/json'}, 
      body:JSON.stringify(data) 
    });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  async actividades_delete(id: string) {
    const r = await apiFetch(`/actividades/${id}`, { method:'DELETE' });
    if (!r.ok) throw new Error(await r.text());
    return r.json();
  },
  
  // ---------- documentos (si lo necesitas) ----------
  async documentos_list() { 
    const r = await apiFetch('/documentos'); 
    return r.json(); 
  },
  async documentos_create(data: any) {
    const r = await apiFetch('/documentos', { 
      method:'POST', 
      headers:{'content-type':'application/json'}, 
      body:JSON.stringify(data) 
    });
    return r.json();
  },
  async documentos_delete(id: string) { 
    const r = await apiFetch(`/documentos/${id}`, { method:'DELETE' }); 
    return r.json(); 
  },
};