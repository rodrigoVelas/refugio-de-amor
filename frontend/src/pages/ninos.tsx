import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import Swal from 'sweetalert2'

export default function Ninos() {
  const [rows, setRows] = useState<any[]>([])
  const [q, setQ] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [mostrarInactivos, setMostrarInactivos] = useState(false)
  const [f, setF] = useState({
    codigo: '',
    nombres: '',
    apellidos: '',
    fecha_nacimiento: '',
    nombre_encargado: '',
    telefono_encargado: '',
    direccion_encargado: ''
  })
  const [editItem, setEditItem] = useState<any|null>(null)

  const load = async () => {
    try {
      // Modificar para incluir parámetro de inactivos si es necesario
      const params = new URLSearchParams()
      if (q) params.append('q', q)
      if (mostrarInactivos) params.append('incluirInactivos', 'true')
      
      const response = await fetch(`${api.baseURL}/ninos?${params}`)
      if (!response.ok) throw new Error('Error al cargar datos')
      
      const data = await response.json()
      setRows(data)
    } catch (error) {
      console.error('Error al cargar:', error)
      Swal.fire('Error', 'No se pudieron cargar los registros', 'error')
    }
  }

  useEffect(() => { 
    load() 
  }, [q, mostrarInactivos])

  const saveNuevo = async (e:any) => {
    e.preventDefault()
    try {
      await api.ninos_create(f)
      setF({
        codigo: '',
        nombres: '',
        apellidos: '',
        fecha_nacimiento: '',
        nombre_encargado: '',
        telefono_encargado: '',
        direccion_encargado: ''
      })
      setShowForm(false)
      await load()
      Swal.fire('Éxito', 'Niño creado correctamente', 'success')
    } catch (error: any) {
      console.error('Error al crear:', error)
      if (error.message?.includes('codigo ya existe')) {
        Swal.fire('Error', 'El código ya existe', 'error')
      } else {
        Swal.fire('Error', 'No se pudo crear el registro', 'error')
      }
    }
  }

  const saveEditar = async (e:any) => {
    e.preventDefault()
    if (!editItem) return
    
    try {
      await api.ninos_update(editItem.id, editItem)
      setEditItem(null)
      await load()
      Swal.fire('Éxito', 'Registro actualizado correctamente', 'success')
    } catch (error: any) {
      console.error('Error al actualizar:', error)
      if (error.message?.includes('codigo ya existe')) {
        Swal.fire('Error', 'El código ya existe', 'error')
      } else {
        Swal.fire('Error', 'No se pudo actualizar el registro', 'error')
      }
    }
  }

  // Función mejorada para manejar eliminación
  const handleEliminar = async (nino: any) => {
    try {
      // Primero verificar dependencias
      const depResponse = await fetch(`${api.baseURL}/ninos/${nino.id}/dependencias`)
      
      if (depResponse.ok) {
        const dependencias = await depResponse.json()
        
        // Si hay dependencias
        if (dependencias.tieneDependencias) {
          const result = await Swal.fire({
            title: 'Registro con datos relacionados',
            html: `
              <p><strong>${nino.nombres} ${nino.apellidos}</strong> tiene registros relacionados:</p>
              <ul style="text-align: left; list-style: none; padding: 0;">
                ${Object.entries(dependencias.detalle)
                  .filter(([_, count]: [string, any]) => count > 0)
                  .map(([tabla, count]: [string, any]) => 
                    `<li>• ${tabla}: <strong>${count}</strong> registros</li>`
                  ).join('')}
              </ul>
              <p style="margin-top: 15px;">¿Qué desea hacer?</p>
            `,
            icon: 'warning',
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: '🔒 Desactivar (Recomendado)',
            confirmButtonColor: '#3085d6',
            denyButtonText: '🗑️ Eliminar todo',
            denyButtonColor: '#d33',
            cancelButtonText: 'Cancelar',
            cancelButtonColor: '#6c757d',
            reverseButtons: true
          })
          
          if (result.isConfirmed) {
            await desactivarNino(nino)
          } else if (result.isDenied) {
            await eliminarConCascada(nino)
          }
        } else {
          // No hay dependencias
          const result = await Swal.fire({
            title: '¿Qué acción desea realizar?',
            html: `
              <p>Registro: <strong>${nino.nombres} ${nino.apellidos}</strong></p>
              <p style="margin-top: 10px;">Puede desactivar el registro (recomendado) o eliminarlo permanentemente</p>
            `,
            icon: 'question',
            showCancelButton: true,
            showDenyButton: true,
            confirmButtonText: '🔒 Desactivar',
            confirmButtonColor: '#3085d6',
            denyButtonText: '🗑️ Eliminar permanentemente',
            denyButtonColor: '#d33',
            cancelButtonText: 'Cancelar',
            cancelButtonColor: '#6c757d',
            reverseButtons: true
          })
          
          if (result.isConfirmed) {
            await desactivarNino(nino)
          } else if (result.isDenied) {
            await eliminarPermanente(nino)
          }
        }
      } else {
        // Si no se puede verificar dependencias, usar método simple
        await eliminarSimple(nino)
      }
    } catch (error) {
      console.error('Error:', error)
      Swal.fire('Error', 'Ocurrió un error al procesar la solicitud', 'error')
    }
  }

  // Desactivar niño (soft delete)
  const desactivarNino = async (nino: any) => {
    try {
      const response = await fetch(`${api.baseURL}/ninos/${nino.id}/desactivar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (!response.ok) {
        throw new Error('Error al desactivar')
      }
      
      await Swal.fire({
        title: '✅ Desactivado',
        text: `${nino.nombres} ${nino.apellidos} ha sido desactivado`,
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      })
      
      await load()
    } catch (error) {
      Swal.fire('Error', 'No se pudo desactivar el registro', 'error')
    }
  }

  // Eliminar permanentemente
  const eliminarPermanente = async (nino: any) => {
    const confirmacion = await Swal.fire({
      title: '⚠️ ¿Está absolutamente seguro?',
      html: `
        <p>Va a eliminar permanentemente a:</p>
        <p><strong>${nino.nombres} ${nino.apellidos}</strong></p>
        <p style="color: red; margin-top: 10px;">Esta acción NO se puede deshacer</p>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar permanentemente',
      confirmButtonColor: '#d33',
      cancelButtonText: 'Cancelar',
      input: 'checkbox',
      inputValue: 0,
      inputPlaceholder: 'Confirmo que quiero eliminar permanentemente este registro',
      reverseButtons: true
    })
    
    if (!confirmacion.isConfirmed || !confirmacion.value) {
      return
    }
    
    try {
      const response = await fetch(`${api.baseURL}/ninos/${nino.id}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (!response.ok) {
        const error = await response.json()
        if (response.status === 409) {
          Swal.fire({
            title: 'No se puede eliminar',
            html: `
              <p>${error.message || 'Existen registros relacionados'}</p>
              <p style="margin-top: 10px;"><small>Sugerencia: Use la opción de desactivar</small></p>
            `,
            icon: 'error'
          })
          return
        }
        throw new Error(error.message)
      }
      
      await Swal.fire({
        title: 'Eliminado',
        text: 'El registro ha sido eliminado permanentemente',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      })
      
      await load()
    } catch (error: any) {
      Swal.fire('Error', error.message || 'No se pudo eliminar el registro', 'error')
    }
  }

  // Eliminar con cascada
  const eliminarConCascada = async (nino: any) => {
    const confirmacion = await Swal.fire({
      title: '⚠️ ADVERTENCIA - ELIMINACIÓN EN CASCADA ⚠️',
      html: `
        <div style="text-align: left;">
          <p><strong>Esta acción eliminará PERMANENTEMENTE:</strong></p>
          <ul style="margin: 10px 0; padding-left: 20px;">
            <li>El registro de ${nino.nombres} ${nino.apellidos}</li>
            <li>TODOS los registros de asistencia</li>
            <li>TODOS los documentos asociados</li>
            <li>TODAS las facturas relacionadas</li>
            <li>TODOS los demás datos vinculados</li>
          </ul>
          <p style="color: red; font-weight: bold;">⚠️ Esta acción NO se puede deshacer</p>
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, ELIMINAR TODO',
      confirmButtonColor: '#d33',
      cancelButtonText: 'Cancelar',
      input: 'text',
      inputPlaceholder: 'Escriba "ELIMINAR" para confirmar',
      inputValidator: (value) => {
        if (value !== 'ELIMINAR') {
          return 'Debe escribir ELIMINAR en mayúsculas'
        }
      },
      reverseButtons: true
    })
    
    if (!confirmacion.isConfirmed) {
      return
    }
    
    try {
      const response = await fetch(`${api.baseURL}/ninos/${nino.id}?forzar=true`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (!response.ok) {
        throw new Error('Error al eliminar')
      }
      
      await Swal.fire({
        title: 'Eliminado',
        text: 'El registro y todos sus datos relacionados han sido eliminados',
        icon: 'success',
        timer: 3000,
        showConfirmButton: false
      })
      
      await load()
    } catch (error) {
      Swal.fire('Error', 'No se pudo completar la eliminación', 'error')
    }
  }

  // Método simple de eliminación (fallback)
  const eliminarSimple = async (nino: any) => {
    const confirmacion = await Swal.fire({
      title: '¿Eliminar registro?',
      text: `¿Está seguro de eliminar a ${nino.nombres} ${nino.apellidos}?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#d33',
      reverseButtons: true
    })
    
    if (!confirmacion.isConfirmed) return
    
    try {
      await api.ninos_delete(nino.id)
      await load()
      Swal.fire('Eliminado', 'El registro ha sido eliminado', 'success')
    } catch (error: any) {
      if (error.message?.includes('foreign key') || error.message?.includes('relacionados')) {
        Swal.fire({
          title: 'No se puede eliminar',
          text: 'Existen registros relacionados. Elimine primero los registros dependientes.',
          icon: 'error'
        })
      } else {
        Swal.fire('Error', 'No se pudo eliminar el registro', 'error')
      }
    }
  }

  // Reactivar niño
  const reactivarNino = async (nino: any) => {
    const confirmacion = await Swal.fire({
      title: '¿Reactivar registro?',
      text: `${nino.nombres} ${nino.apellidos} volverá a estar activo`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, reactivar',
      confirmButtonColor: '#28a745',
      cancelButtonText: 'Cancelar',
      reverseButtons: true
    })
    
    if (!confirmacion.isConfirmed) return
    
    try {
      const response = await fetch(`${api.baseURL}/ninos/${nino.id}/reactivar`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      })
      
      if (!response.ok) throw new Error('Error al reactivar')
      
      await Swal.fire({
        title: 'Reactivado',
        text: 'El registro ha sido reactivado',
        icon: 'success',
        timer: 2000,
        showConfirmButton: false
      })
      
      await load()
    } catch (error) {
      Swal.fire('Error', 'No se pudo reactivar el registro', 'error')
    }
  }

  return (
    <div>
      <h1 className="text-xl font-bold">Niños</h1>
      
      {/* Buscar y filtros */}
      <div className="form" style={{marginTop:12, display: 'flex', gap: '10px', alignItems: 'center', maxWidth: 600}}>
        <input
          className="input"
          placeholder="Buscar por código o nombre"
          value={q}
          onChange={e=>setQ(e.target.value)}
          style={{flex: 1}}
        />
        <label style={{display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer'}}>
          <input
            type="checkbox"
            checked={mostrarInactivos}
            onChange={e=>setMostrarInactivos(e.target.checked)}
          />
          <span>Mostrar inactivos</span>
        </label>
      </div>

      {/* Botón para abrir formulario */}
      <div style={{marginTop:16}}>
        <button className="btn" onClick={()=>setShowForm(true)}>
          + Nuevo niño
        </button>
      </div>

      {/* Formulario modal para crear */}
      {showForm && (
        <div className="modal">
          <div className="card" style={{maxWidth:500}}>
            <h2 className="font-bold">Nuevo niño</h2>
            <form className="form" onSubmit={saveNuevo}>
              <input
                className="input"
                placeholder="Código"
                value={f.codigo}
                onChange={e=>setF({...f, codigo:e.target.value})}
                required
              />
              <input
                className="input"
                placeholder="Nombres"
                value={f.nombres}
                onChange={e=>setF({...f, nombres:e.target.value})}
                required
              />
              <input
                className="input"
                placeholder="Apellidos"
                value={f.apellidos}
                onChange={e=>setF({...f, apellidos:e.target.value})}
                required
              />
              <input
                type="date"
                className="input"
                value={f.fecha_nacimiento}
                onChange={e=>setF({...f, fecha_nacimiento:e.target.value})}
              />
              <input
                className="input"
                placeholder="Nombre del encargado"
                value={f.nombre_encargado}
                onChange={e=>setF({...f, nombre_encargado:e.target.value})}
              />
              <input
                className="input"
                placeholder="Teléfono del encargado"
                value={f.telefono_encargado}
                onChange={e=>setF({...f, telefono_encargado:e.target.value})}
              />
              <input
                className="input"
                placeholder="Dirección del encargado"
                value={f.direccion_encargado}
                onChange={e=>setF({...f, direccion_encargado:e.target.value})}
              />
              <div className="flex">
                <button className="btn">Crear</button>
                <button type="button" className="btn" onClick={()=>setShowForm(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tabla */}
      <table className="table" style={{marginTop:16}}>
        <thead>
          <tr>
            <th>Código</th>
            <th>Nombre</th>
            <th>Fecha nac.</th>
            <th>Encargado</th>
            <th>Teléfono</th>
            <th>Dirección</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r=>(
            <tr key={r.id} style={{opacity: r.activo === false ? 0.6 : 1}}>
              <td>{r.codigo}</td>
              <td>{r.nombres} {r.apellidos}</td>
              <td>{r.fecha_nacimiento || '-'}</td>
              <td>{r.nombre_encargado || '-'}</td>
              <td>{r.telefono_encargado || '-'}</td>
              <td>{r.direccion_encargado || '-'}</td>
              <td>
                {r.activo === false ? (
                  <span style={{color: 'red'}}>Inactivo</span>
                ) : (
                  <span style={{color: 'green'}}>Activo</span>
                )}
              </td>
              <td>
                {r.activo !== false ? (
                  <>
                    <button className="btn" onClick={()=>setEditItem(r)}>Editar</button>{' '}
                    <button className="btn" onClick={()=>handleEliminar(r)}>Eliminar</button>
                  </>
                ) : (
                  <button className="btn" onClick={()=>reactivarNino(r)}>Reactivar</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal editar */}
      {editItem && (
        <div className="modal">
          <div className="card" style={{maxWidth:500}}>
            <h2 className="font-bold">Editar niño</h2>
            <form className="form" onSubmit={saveEditar}>
              <input
                className="input"
                placeholder="Código"
                value={editItem.codigo || ''}
                onChange={e=>setEditItem({...editItem, codigo:e.target.value})}
                required
              />
              <input
                className="input"
                placeholder="Nombres"
                value={editItem.nombres || ''}
                onChange={e=>setEditItem({...editItem, nombres:e.target.value})}
                required
              />
              <input
                className="input"
                placeholder="Apellidos"
                value={editItem.apellidos || ''}
                onChange={e=>setEditItem({...editItem, apellidos:e.target.value})}
                required
              />
              <input
                type="date"
                className="input"
                value={editItem.fecha_nacimiento || ''}
                onChange={e=>setEditItem({...editItem, fecha_nacimiento:e.target.value})}
              />
              <input
                className="input"
                placeholder="Nombre del encargado"
                value={editItem.nombre_encargado || ''}
                onChange={e=>setEditItem({...editItem, nombre_encargado:e.target.value})}
              />
              <input
                className="input"
                placeholder="Teléfono del encargado"
                value={editItem.telefono_encargado || ''}
                onChange={e=>setEditItem({...editItem, telefono_encargado:e.target.value})}
              />
              <input
                className="input"
                placeholder="Dirección del encargado"
                value={editItem.direccion_encargado || ''}
                onChange={e=>setEditItem({...editItem, direccion_encargado:e.target.value})}
              />
              <div className="flex">
                <button className="btn">Guardar</button>
                <button type="button" className="btn" onClick={()=>setEditItem(null)}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}