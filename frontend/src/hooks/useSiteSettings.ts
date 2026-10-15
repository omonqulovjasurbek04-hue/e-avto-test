import { useEffect, useState } from "react";
import { siteService, type SiteSettings } from "@/services/site.service";

let cache: SiteSettings | null = null;
let inflight: Promise<SiteSettings> | null = null;

/**
 * Public site settings edited in the admin panel (name, contacts, hero text).
 * Fetched once per page load and shared; on failure the components fall back to their built-in texts.
 */
export function useSiteSettings(): SiteSettings {
  const [settings, setSettings] = useState<SiteSettings>(cache ?? {});

  useEffect(() => {
    if (cache) return;
    inflight ??= siteService.settings().catch(() => ({}) as SiteSettings);
    let alive = true;
    void inflight.then((s) => {
      cache = s;
      if (alive) setSettings(s);
    });
    return () => {
      alive = false;
    };
  }, []);

  return settings;
}
