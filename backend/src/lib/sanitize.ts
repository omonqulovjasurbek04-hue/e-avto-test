import sanitizeHtml from "sanitize-html";

/** Rich text allowed in CMS pages/news/FAQ. Everything else (scripts, handlers, iframes, styles) is dropped. */
const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: ["p", "br", "strong", "em", "u", "s", "h2", "h3", "h4", "ul", "ol", "li", "blockquote", "a", "img", "hr", "code", "pre", "table", "thead", "tbody", "tr", "th", "td"],
  allowedAttributes: { a: ["href", "title", "target", "rel"], img: ["src", "alt", "title", "width", "height"] },
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { img: ["http", "https"] },
  allowProtocolRelative: false,
  transformTags: {
    // Links that open a new tab must not give the target page access to window.opener.
    a: (tagName, attribs) => ({
      tagName,
      attribs: { ...attribs, ...(attribs.target === "_blank" ? { rel: "noopener noreferrer" } : {}) },
    }),
  },
  disallowedTagsMode: "discard",
};

export const sanitizeRichText = (html: string): string => sanitizeHtml(html, OPTIONS);

/** Plain text only (titles, SEO fields, contact messages). */
export const toPlainText = (text: string): string => sanitizeHtml(text, { allowedTags: [], allowedAttributes: {} }).trim();

export const slugify = (input: string): string =>
  input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[ʻʼ'’`]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
