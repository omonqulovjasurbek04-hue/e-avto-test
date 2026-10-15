import { useMemo } from "react";
import DOMPurify from "dompurify";

/**
 * Renders CMS rich text. The server already sanitises on write; this second pass (defence in depth)
 * guards against anything stored before that rule existed or edited directly in the database.
 */
export default function SafeHtml({ html, className }: { html: string; className?: string }) {
  const clean = useMemo(
    () =>
      DOMPurify.sanitize(html, {
        USE_PROFILES: { html: true },
        FORBID_TAGS: ["style", "iframe", "form", "input", "script"],
        FORBID_ATTR: ["style"],
      }),
    [html]
  );
  return <div className={className ?? "prose-content space-y-3 text-slate-700 dark:text-slate-300"} dangerouslySetInnerHTML={{ __html: clean }} />;
}
