/**
 * Makes a video file the lesson's adaptive (HLS) video: H.264 in 1080p/720p/480p/360p, 4-second
 * segments and a poster, stored in MEDIA_DIR (or S3) and streamed through signed links.
 *
 *   npm run media:import -- --lesson <lessonId> --file ../darslik/1-dars.mp4 [--title "1-dars"] [--by +998901234567]
 *   (production image:  node dist/scripts/importLessonVideo.js …)
 *
 * Needs ffmpeg and ffprobe (FFMPEG_PATH / FFPROBE_PATH). --by is the staff account recorded as the
 * uploader (default: the first superadmin).
 */
import fs from "fs";
import path from "path";
import { prisma } from "../config/database";
import { importHlsVideo } from "../services/media.service";

const arg = (name: string) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : undefined;
};

async function main() {
  const lessonId = arg("lesson");
  const file = arg("file");
  if (!lessonId || !file) {
    console.error("Usage: npm run media:import -- --lesson <lessonId> --file <video.mp4> [--title <text>] [--by <phone>]");
    process.exitCode = 2;
    return;
  }
  const input = path.resolve(file);
  if (!fs.existsSync(input)) throw new Error(`File not found: ${input}`);

  const by = arg("by");
  const actor = by
    ? await prisma.user.findUnique({ where: { phone: by }, select: { id: true } })
    : await prisma.user.findFirst({ where: { role: "SUPERADMIN" }, orderBy: { createdAt: "asc" }, select: { id: true } });
  if (!actor) throw new Error(by ? `No account with phone ${by}` : "No superadmin found; pass --by <phone>");

  const started = Date.now();
  console.log(`Converting ${path.basename(input)} …`);
  const result = await importHlsVideo(actor.id, input, { lessonId, title: arg("title") });
  console.log(
    `Done in ${Math.round((Date.now() - started) / 1000)} s: video ${result.id}, ${result.durationSec} s, ` +
      `${result.renditions.map((h) => `${h}p`).join("/")}, ${result.files} files, ${(result.bytes / 1024 / 1024).toFixed(1)} MB`
  );
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
