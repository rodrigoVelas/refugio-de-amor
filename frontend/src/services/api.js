// src/services/api.ts
import axios from "axios";

const api = axios.create({
  baseURL: "/api", // ajustá si tu backend corre en otro host/puerto
  timeout: 15000,
});

api.interceptors.response.use(
  (r) => r,
  (err) => {
    const msg = err?.response?.data?.message || err.message || "Error de red";
    console.error("[API]", msg);
    return Promise.reject(err);
  }
);

export default api;
