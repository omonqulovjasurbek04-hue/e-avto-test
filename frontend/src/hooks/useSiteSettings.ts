import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { siteService, type SiteSettings } from "@/services/site.service";

// One copy per language: texts like the hero title differ, the rest is shared.
const cache = new Map<string, SiteSettings>();
const inflight = new Map<string, Promise<SiteSettings>>();

/**
 * Public site settings edited in the admin panel (name, contacts, hero text) in the current language.
 * Fetched once per language and page load and shared; on failure the components fall back to their built-in texts.
 */
export function useSiteSettings(): SiteSettings {
  const { i18n } = useTranslation();
  const lang = i18n.language;
  const [settings, setSettings] = useState<SiteSettings>(cache.get(lang) ?? {});

  useEffect(() => {
    const cached = cache.get(lang);
    if (cached) {
      setSettings(cached);
      return;
    }
    let request = inflight.get(lang);
    if (!request) {
      request = siteService.settings().catch(() => ({}) as SiteSettings);
      inflight.set(lang, request);
    }
    let alive = true;
    void request.then((s) => {
      cache.set(lang, s);
      if (alive) setSettings(s);
    });
    return () => {
      alive = false;
    };
  }, [lang]);

  return settings;
}
