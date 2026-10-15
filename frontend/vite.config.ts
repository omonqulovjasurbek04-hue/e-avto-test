import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(({ command, mode }) => {
  // A production bundle that silently points at localhost (or at mock data) is a deployment mistake, so fail the build.
  if (command === "build" && mode === "production" && process.env.VITE_ALLOW_LOCAL_BUILD !== "true") {
    const env = loadEnv(mode, process.cwd(), "VITE_");
    const api = process.env.VITE_API_URL ?? env.VITE_API_URL ?? "";
    if (!/^https:\/\/[^\s]+$/i.test(api) || /localhost|127\.0\.0\.1/i.test(api)) {
      throw new Error("Production build needs VITE_API_URL=https://<your-api-domain>/api (set VITE_ALLOW_LOCAL_BUILD=true only for a local test build).");
    }
    if ((process.env.VITE_USE_MOCK ?? env.VITE_USE_MOCK) === "true") {
      throw new Error("VITE_USE_MOCK=true must never be used in a production build.");
    }
  }

  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
    },
    server: {
      port: 5173,
      host: true,
    },
  };
});
