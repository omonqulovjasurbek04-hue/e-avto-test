import { useEffect } from "react";

/** Sets the tab title and meta description for CMS-driven pages (SEO fields from the admin panel). */
export function useDocumentMeta(title?: string | null, description?: string | null) {
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = title;
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]');
    const previousDesc = meta?.content;
    if (description) {
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "description";
        document.head.appendChild(meta);
      }
      meta.content = description;
    }
    return () => {
      document.title = previous;
      if (meta && previousDesc !== undefined) meta.content = previousDesc;
    };
  }, [title, description]);
}
