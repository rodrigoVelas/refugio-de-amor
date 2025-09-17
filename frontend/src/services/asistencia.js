import api from "./api";

// Estados válidos (coinciden con tu ENUM en Postgres)
export const ESTADOS_ASISTENCIA = [
  "PRESENTE",
  "AUSENTE",
  "TARDE",
  "JUSTIFICADA",
];

// Crea una clase de asistencia
// payload esperado: { fecha, hora, maestro_id, nivel_id, subnivel_id, suplencia }
export async function crearClase(payload) {
  const { data } = await api.post("/asistencia", payload);
  return data; // debería incluir { id, ... }
}

// Trae los niños asignados a un subnivel (para armar la lista)
export async function obtenerNinosDeSubnivel(subnivelId) {
  const { data } = await api.get(`/subniveles/${subnivelId}/ninos`);
  return data; // array de { id, nombres, apellidos, ... }
}

// Obtiene el detalle guardado (si ya existe) para una clase
export async function obtenerDetalle(asistenciaId) {
  const { data } = await api.get(`/asistencia/${asistenciaId}/detalle`);
  return data; // array de { id_nino, estado, justificacion, observaciones }
}

// Guarda/actualiza el detalle en bloque (upsert masivo)
export async function guardarDetalle(asistenciaId, items) {
  // items: [{ id_nino, estado, justificacion, observaciones }, ...]
  const { data } = await api.put(`/asistencia/${asistenciaId}/detalle`, items);
  return data;
}

// (Opcional) Resumen de la clase (totales por estado)
export async function obtenerResumen(asistenciaId) {
  const { data } = await api.get(`/asistencia/${asistenciaId}/resumen`);
  return data; // { PRESENTE: n, AUSENTE: n, ... }
}
