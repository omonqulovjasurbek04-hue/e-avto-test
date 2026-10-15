const useMock = import.meta.env.VITE_USE_MOCK === "true";

export const env = {
  apiUrl: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  // Offline demo mode with local mock data. Never enable it in production builds.
  useMock,
};
