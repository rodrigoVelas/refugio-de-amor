import { useEffect, useState } from 'react'; import { api } from '../lib/api'
export default function Subniveles(){
  const [rows,setRows]=useState<any[]>([]); const [niveles,setNiveles]=useState<any[]>([])
  const [f,setF]=useState({nivel_id:'',nombre:'',dias:'lunes,miercoles',horario:'14:00-16:00'})
  const load=()=> api.subniveles_list().then(setRows); useEffect(()=>{ load(); api.niveles_list().then(setNiveles) },[])
  return <div>
    <h1>subniveles</h1>
    <form className='form' onSubmit={async(e)=>{e.preventDefault(); await api.subniveles_create({...f, dias:f.dias.split(',').map(s=>s.trim())}); setF({...f, nombre:''}); load()}}>
      <select className='input' value={f.nivel_id} onChange={e=>setF({...f, nivel_id:e.target.value})} required>
        <option value=''>Seleccionar nivel</option>
        {niveles.map((n:any)=> <option key={n.id} value={n.id}>{n.nombre}</option>)}
      </select>
      <input className='input' placeholder='nombre subnivel' value={f.nombre} onChange={e=>setF({...f,nombre:e.target.value})} required />
      <input className='input' placeholder='dias (coma)' value={f.dias} onChange={e=>setF({...f,dias:e.target.value})} />
      <input className='input' placeholder='horario' value={f.horario} onChange={e=>setF({...f,horario:e.target.value})} />
      <button className='btn'>Crear</button>
    </form>
    <table className='table' style={{marginTop:12}}><thead><tr><th>nivel</th><th>Nombre</th><th>dias</th><th>Horario</th><th>Acciones</th></tr></thead><tbody>
      {rows.map((r:any)=>(<tr key={r.id}><td>{r.nivel_nombre}</td><td>{r.nombre}</td><td>{(r.dias||[]).join(', ')}</td><td>{r.horario||'-'}</td>
      <td><button className='btn' onClick={async()=>{ const nombre=prompt('nuevo nombre', r.nombre)||r.nombre; await api.subniveles_update(r.id,{nombre}); load() }}>Editar</button>
      {' '}<button className='btn' onClick={async()=>{ if(confirm('eliminar?')){ await api.subniveles_delete(r.id); load() } }}>Eliminar</button></td></tr>))}
    </tbody></table>
  </div>
}
