const KEY_RE = /^[a-f0-9-]{36}\.(mp4|webm|pdf|png|jpg|webp)$/;

/** Keys are generated server-side; this guard makes path traversal impossible even if one leaks from the DB. */
export const assertKey = (key: string): string => {
  if (!KEY_RE.test(key)) throw new Error("Invalid storage key");
  return key;
};
