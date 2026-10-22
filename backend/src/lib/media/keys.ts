const KEY_RE = /^[a-f0-9-]{36}\.(mp4|webm|pdf|png|jpg|webp)$/;

/**
 * Files of an adaptive (HLS) video, all under its "<uuid>/" folder:
 * master.m3u8, poster.jpg, <height>p/index.m3u8 and <height>p/seg_<n>.ts.
 */
const HLS_FILE_RE = /^(master\.m3u8|poster\.jpg|\d{3,4}p\/index\.m3u8|\d{3,4}p\/seg_\d{1,5}\.ts)$/;
const HLS_KEY_RE = /^[a-f0-9-]{36}\/(?:master\.m3u8|poster\.jpg|\d{3,4}p\/index\.m3u8|\d{3,4}p\/seg_\d{1,5}\.ts)$/;
export const HLS_FOLDER_RE = /^[a-f0-9-]{36}$/;

/** Keys are generated server-side; this guard makes path traversal impossible even if one leaks from the DB. */
export const assertKey = (key: string): string => {
  if (!KEY_RE.test(key) && !HLS_KEY_RE.test(key)) throw new Error("Invalid storage key");
  return key;
};

/** "720p/seg_3.ts" etc.: a file name a player may ask for inside an HLS folder; null for anything else. */
export const hlsFile = (name: string): string | null => (HLS_FILE_RE.test(name) ? name : null);

export const hlsContentType = (name: string) =>
  name.endsWith(".m3u8") ? "application/vnd.apple.mpegurl" : name.endsWith(".ts") ? "video/mp2t" : "image/jpeg";
