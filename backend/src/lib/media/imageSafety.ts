/**
 * Looks inside a picture for code or files hidden in it: a program or archive disguised as an image,
 * PHP / JavaScript / HTML inside the bytes, active content in an SVG, or a file glued onto the end of a
 * PNG, GIF or JPEG (a "polyglot"). Only strong signatures are used, so ordinary photos never trip it.
 *
 * The site's own copy lives in frontend/src/utils/imageSafety.ts (the browser explains the reason
 * before uploading); keep the two rule sets the same.
 */
export type ThreatCode =
  | "executable"
  | "linuxProgram"
  | "archive"
  | "pdf"
  | "html"
  | "shellScript"
  | "php"
  | "script"
  | "svgEvents"
  | "svgJsLink"
  | "svgForeign"
  | "svgEntity"
  | "svgExternal"
  | "hiddenFile";

const startsWith = (b: Uint8Array, sig: number[], at = 0) => sig.every((v, i) => b[at + i] === v);
const latin1 = (b: Uint8Array, start = 0, end = b.length) => {
  let s = "";
  for (let i = start; i < end; i += 0x8000) s += String.fromCharCode(...b.subarray(i, Math.min(end, i + 0x8000)));
  return s;
};
// Very large files: the start and the end are where hidden payloads sit.
const SCAN_ALL_UP_TO = 24 * 1024 * 1024;
const SCAN_EDGE = 12 * 1024 * 1024;

export function inspectImageBytes(bytes: Uint8Array): ThreatCode[] {
  const found = new Set<ThreatCode>();

  // 1. What the file really is, whatever its name says.
  if (startsWith(bytes, [0x4d, 0x5a])) found.add("executable");
  if (startsWith(bytes, [0x7f, 0x45, 0x4c, 0x46])) found.add("linuxProgram");
  if (startsWith(bytes, [0x50, 0x4b, 0x03, 0x04]) || startsWith(bytes, [0x52, 0x61, 0x72, 0x21]) || startsWith(bytes, [0x37, 0x7a, 0xbc, 0xaf, 0x27, 0x1c])) found.add("archive");
  if (startsWith(bytes, [0x25, 0x50, 0x44, 0x46])) found.add("pdf");
  const head = latin1(bytes, 0, Math.min(bytes.length, 4096)).replace(/^\xEF\xBB\xBF/, "").trimStart().toLowerCase();
  if (head.startsWith("#!")) found.add("shellScript");
  if (head.startsWith("<!doctype html") || head.startsWith("<html")) found.add("html");

  // 2. Code written into the bytes (works for binary images too: these markers do not occur by chance).
  const text =
    bytes.length <= SCAN_ALL_UP_TO
      ? latin1(bytes)
      : latin1(bytes, 0, SCAN_EDGE) + "\n" + latin1(bytes, bytes.length - SCAN_EDGE, bytes.length);
  if (/<\?php/i.test(text)) found.add("php");
  if (/<script[\s>/]/i.test(text)) found.add("script");
  if (/<iframe[\s>/]/i.test(text)) found.add("html");

  // 3. SVG is a text format that browsers can run code from.
  if (/<svg[\s>]/i.test(head) || /<svg[\s>]/i.test(text.slice(0, 65536))) {
    if (/\son[a-z]+\s*=/i.test(text)) found.add("svgEvents");
    if (/javascript\s*:/i.test(text)) found.add("svgJsLink");
    if (/<foreignObject[\s>]/i.test(text)) found.add("svgForeign");
    if (/<!ENTITY/i.test(text)) found.add("svgEntity");
    if (/(?:href|src)\s*=\s*["']\s*(?:https?:)?\/\//i.test(text)) found.add("svgExternal");
  }

  // 4. A whole file glued onto the picture: its own signature sits inside or at the very end.
  if (text.includes("This program cannot be run in DOS mode")) found.add("executable");
  const tail = latin1(bytes, Math.max(0, bytes.length - 66_000), bytes.length);
  // A ZIP (also .docx, .apk, .jar) always ends with its "end of central directory" record.
  if (tail.includes("PK\x05\x06") && !startsWith(bytes, [0x50, 0x4b, 0x03, 0x04])) found.add("hiddenFile");
  const body = text.slice(16);
  if (body.includes("Rar!\x1a\x07") || body.includes("7z\xbc\xaf\x27\x1c") || /%PDF-\d\.\d/.test(body)) found.add("hiddenFile");
  const png = startsWith(bytes, [0x89, 0x50, 0x4e, 0x47]);
  if (png) {
    const iend = text.lastIndexOf("IEND");
    // IEND + its 4-byte checksum closes a PNG; more than a few stray bytes after it is a second file.
    if (iend > 0 && bytes.length - (iend + 8) > 64) {
      const after = bytes.subarray(iend + 8);
      if (startsWith(after, [0x4d, 0x5a]) || startsWith(after, [0x7f, 0x45, 0x4c, 0x46]) || startsWith(after, [0x50, 0x4b, 0x03, 0x04])) found.add("hiddenFile");
    }
  }

  return [...found];
}
