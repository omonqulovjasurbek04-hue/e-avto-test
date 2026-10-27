import { env } from "@/config/env";

/**
 * The server stores its own images as "/api/images/…". On the live site that path is the site's own
 * /api; in development the API runs on another port, so the path is resolved against VITE_API_URL.
 * Absolute URLs (a Google profile picture) are returned as they are.
 */
export const assetUrl = (path: string | null | undefined): string | undefined => {
  if (!path) return undefined;
  if (!path.startsWith("/api/")) return path;
  return `${env.apiUrl.replace(/\/api\/?$/, "")}${path}`;
};
