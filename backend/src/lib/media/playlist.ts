/**
 * Rewrites the media lines of an HLS playlist (everything that is not a #tag or blank), e.g. to turn
 * "seg_3.ts" into a short-lived signed link to the bucket. Lines the resolver returns null for are kept.
 */
export const rewritePlaylist = async (text: string, resolve: (uri: string) => Promise<string | null>): Promise<string> => {
  const lines = text.split(/\r?\n/);
  const out = await Promise.all(
    lines.map(async (line) => {
      const uri = line.trim();
      if (!uri || uri.startsWith("#")) return line;
      return (await resolve(uri)) ?? line;
    })
  );
  return out.join("\n");
};
