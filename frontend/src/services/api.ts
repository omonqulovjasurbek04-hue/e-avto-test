import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { env } from "../config/env";
import { getAccessToken, pendingRefresh, refreshSession, setAccessToken } from "./session";

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
  // The refresh cookie is only sent to /api/auth; other requests authenticate with the in-memory Bearer token.
  withCredentials: true,
  headers: { "Content-Type": "application/json", "X-Requested-With": "XMLHttpRequest" },
});

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  // Requests fired while the start-up refresh runs wait for it, so they carry the token.
  const pending = pendingRefresh();
  if (pending) await pending;
  const token = getAccessToken();
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const PUBLIC_PREFIXES = ["/login", "/register", "/forgot-password", "/reset-password", "/verify-email", "/courses", "/pricing", "/news", "/faq", "/contact", "/about", "/privacy", "/terms", "/p/", "/403", "/404", "/500"];
const isPublicPath = (path: string) => path === "/" || PUBLIC_PREFIXES.some((p) => path === p || path.startsWith(p.endsWith("/") ? p : `${p}/`));

const AUTH_ENDPOINTS = ["/auth/login", "/auth/register", "/auth/password", "/auth/reset-password", "/auth/2fa/login", "/auth/2fa/disable", "/auth/verify-email"];

/** Lets the auth store drop the user when the session cannot be renewed (set by auth.store). */
let onSessionLost: () => void = () => {};
export const setSessionLostHandler = (fn: () => void) => {
  onSessionLost = fn;
};

type RetriableConfig = InternalAxiosRequestConfig & { _retried?: boolean };

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string; errors?: unknown }>) => {
    const status = error.response?.status;
    const config = error.config as RetriableConfig | undefined;
    const url = config?.url ?? "";

    if (status === 401 && config && !AUTH_ENDPOINTS.some((p) => url.includes(p))) {
      // The access token expired: renew it silently once and repeat the request.
      if (!config._retried && getAccessToken()) {
        config._retried = true;
        const renewed = await refreshSession();
        if (renewed) return apiClient(config);
      }
      // The session is over. Only pages that need an account send the user to /login;
      // a visitor reading a public page (home, courses, news...) simply continues as a guest.
      setAccessToken(null);
      onSessionLost();
      if (typeof window !== "undefined" && !isPublicPath(window.location.pathname)) {
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
