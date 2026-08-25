import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { storage } from "../utils/storage";

const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request Interceptor: Attach JWT Token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = storage.getToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Format errors and handle 401 unauthorized
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<{ message?: string; errors?: any }>) => {
    if (error.response?.status === 401) {
      storage.removeToken();
      storage.removeUser();
    }
    const message =
      error.response?.data?.message ||
      error.message ||
      "Server bilan ulanishda xatolik yuz berdi.";

    return Promise.reject({
      status: error.response?.status,
      message,
      errors: error.response?.data?.errors,
    });
  }
);
