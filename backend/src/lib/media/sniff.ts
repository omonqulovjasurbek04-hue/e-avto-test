/**
 * Detects the real file type from its first bytes; the client-declared Content-Type and the file
 * extension are never trusted. Returns null for anything not on the allow-list.
 */
export interface DetectedType {
  mime: string;
  ext: string;
  kind: "video" | "document" | "image";
}

const startsWith = (b: Buffer, sig: number[], offset = 0) => sig.every((v, i) => b[offset + i] === v);

export const detectType = (head: Buffer): DetectedType | null => {
  if (head.length >= 12 && startsWith(head, [0x66, 0x74, 0x79, 0x70], 4)) return { mime: "video/mp4", ext: "mp4", kind: "video" }; // "ftyp"
  if (startsWith(head, [0x1a, 0x45, 0xdf, 0xa3])) return { mime: "video/webm", ext: "webm", kind: "video" };
  if (startsWith(head, [0x25, 0x50, 0x44, 0x46, 0x2d])) return { mime: "application/pdf", ext: "pdf", kind: "document" }; // "%PDF-"
  if (startsWith(head, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return { mime: "image/png", ext: "png", kind: "image" };
  if (startsWith(head, [0xff, 0xd8, 0xff])) return { mime: "image/jpeg", ext: "jpg", kind: "image" };
  return null;
};
