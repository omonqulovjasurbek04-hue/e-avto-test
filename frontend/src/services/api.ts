import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { storage } from "../utils/storage";
import { env } from "../config/env";

/** Error thrown by every failed API call, so pages can rely on `instanceof Error`. */
export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public errors?: unknown
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export const apiClient: AxiosInstance = axios.create({
  baseURL: env.apiUrl,
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = storage.getToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const AUTH_ENDPOINTS = ["/auth/login", "/auth/register", "/auth/password", "/auth/reset-password"];

apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; errors?: unknown }>) => {
    const status = error.response?.status;
    const url = error.config?.url ?? "";

    // Expired/invalid session: clear it and send the user to the login page.
    if (status === 401 && !AUTH_ENDPOINTS.some((p) => url.includes(p))) {
      storage.removeToken();
      storage.removeUser();
      if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
        window.location.assign("/login");
      }
    }

    const message = error.response
      ? error.response.data?.message || error.message
      : "Server bilan ulanishda xatolik yuz berdi. Internet aloqasini tekshiring.";

    return Promise.reject(new ApiError(message, status, error.response?.data?.errors));
  }
);

interface Envelope<T> {
  success: boolean;
  data: T;
  pagination?: { page: number; limit: number; total: number; totalPages: number };
}

export async function apiGet<T>(url: string, params?: object): Promise<T> {
  return (await apiClient.get<Envelope<T>>(url, { params })).data.data;
}
export async function apiPost<T>(url: string, body?: object): Promise<T> {
  return (await apiClient.post<Envelope<T>>(url, body)).data.data;
}
export async function apiPut<T>(url: string, body?: object): Promise<T> {
  return (await apiClient.put<Envelope<T>>(url, body)).data.data;
}
export async function apiPatch<T>(url: string, body?: object): Promise<T> {
  return (await apiClient.patch<Envelope<T>>(url, body)).data.data;
}
export async function apiDelete<T>(url: string): Promise<T> {
  return (await apiClient.delete<Envelope<T>>(url)).data.data;
}
export async function apiGetPage<T>(url: string, params?: object) {
  const res = await apiClient.get<Envelope<T[]>>(url, { params });
  return {
    items: res.data.data,
    pagination: res.data.pagination ?? { page: 1, limit: res.data.data.length, total: res.data.data.length, totalPages: 1 },
  };
}
