import { useEffect, useState } from 'react'; import { api } from '../lib/api'
export default function PerfilVer(){ const [d,setD]=useState<any>(null); useEffect(()=>{ api.perfil_get().then(setD) },[]); if(!d) return <div>cargando...</div>;
return <div><h1>mi perfil</h1><p><b>email:</b> {d.email}</p><p><b>nombres:</b> {d.nombres}</p><p><b>apellidos:</b> {d.apellidos}</p><p><b>telefono:</b> {d.telefono||'-'}</p><a className='btn' href='/perfil/editar'>editar</a></div>}
