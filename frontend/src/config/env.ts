export const env = {
  apiUrl: import.meta.env.VITE_API_URL || "http://localhost:5000/api",
  useMock: true, // TODO: set to false when the real backend is available
};
