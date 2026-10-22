import { spawn } from "child_process";
import fsp from "fs/promises";
import path from "path";
import { env } from "../../config/env";

/**
 * Adaptive streaming the way YouTube does it: the video is cut into short H.264 segments at several
 * qualities, and the player switches between them as the connection allows. Playback starts after the
 * first segment (no waiting for a whole file), seeking jumps to one segment, and every browser plays
 * H.264 (HEVC/H.265 originals do not play in most of them).
 */
export interface Rendition {
  height: number;
  videoKbps: number;
}

/** Highest first. Only renditions not taller than the original are produced (no upscaling). */
export const LADDER: Rendition[] = [
  { height: 1080, videoKbps: 5000 },
  { height: 720, videoKbps: 2800 },
  { height: 480, videoKbps: 1400 },
  { height: 360, videoKbps: 800 },
];

/** Segment length in seconds: short enough to start fast and to switch quality quickly. */
export const SEGMENT_SECONDS = 4;

export interface ProbeResult {
  durationSec: number;
  width: number;
  height: number;
  hasAudio: boolean;
}

const run = (cmd: string, args: string[]): Promise<string> =>
  new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { windowsHide: true });
    let out = "";
    let err = "";
    child.stdout.on("data", (d: Buffer) => (out += d.toString()));
    child.stderr.on("data", (d: Buffer) => (err = (err + d.toString()).slice(-4000)));
    child.on("error", (e) => reject(new Error(`${cmd} is not available: ${e.message}`)));
    child.on("close", (code) => (code === 0 ? resolve(out) : reject(new Error(`${cmd} failed (${code}): ${err.trim().split("\n").slice(-3).join(" ")}`))));
  });

export const probe = async (input: string): Promise<ProbeResult> => {
  const json = JSON.parse(await run(env.FFPROBE_PATH, ["-v", "error", "-print_format", "json", "-show_format", "-show_streams", input])) as {
    format?: { duration?: string };
    streams?: { codec_type?: string; width?: number; height?: number }[];
  };
  const video = json.streams?.find((s) => s.codec_type === "video");
  if (!video?.width || !video.height) throw new Error("The file has no video stream");
  return {
    durationSec: Math.round(Number(json.format?.duration ?? 0)),
    width: video.width,
    height: video.height,
    hasAudio: Boolean(json.streams?.some((s) => s.codec_type === "audio")),
  };
};

/** Renditions for a source: everything up to its height; a source a bit under a step (1072 → 1080p) still gets it. */
export const renditionsFor = (sourceHeight: number): Rendition[] => {
  const fit = LADDER.filter((r) => r.height <= sourceHeight * 1.05);
  return fit.length > 0 ? fit : [LADDER[LADDER.length - 1]];
};

const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);

/**
 * Writes outDir/master.m3u8, outDir/<h>p/index.m3u8 + seg_<n>.ts and outDir/poster.jpg.
 * One ffmpeg pass encodes every rendition; keyframes every SEGMENT_SECONDS keep the segments aligned,
 * which is what lets the player switch quality at any segment boundary.
 */
export const transcodeToHls = async (input: string, outDir: string): Promise<ProbeResult & { renditions: number[] }> => {
  const info = await probe(input);
  // ffmpeg writes the paths it is given into master.m3u8; Windows backslashes would end up in the URLs.
  const out = outDir.split(path.sep).join("/");
  const ladder = renditionsFor(info.height);
  for (const r of ladder) await fsp.mkdir(path.join(outDir, `${r.height}p`), { recursive: true });

  const split = `[0:v]split=${ladder.length}${ladder.map((_, i) => `[s${i}]`).join("")}`;
  const scales = ladder.map((r, i) => `[s${i}]scale=-2:${even(Math.min(r.height, info.height))}:flags=lanczos,format=yuv420p[v${i}]`);
  const args = ["-v", "error", "-y", "-i", input, "-filter_complex", [split, ...scales].join(";")];
  ladder.forEach((r, i) => {
    args.push("-map", `[v${i}]`);
    if (info.hasAudio) args.push("-map", "0:a:0");
    args.push(`-b:v:${i}`, `${r.videoKbps}k`, `-maxrate:v:${i}`, `${Math.round(r.videoKbps * 1.07)}k`, `-bufsize:v:${i}`, `${Math.round(r.videoKbps * 1.5)}k`);
  });
  args.push(
    "-c:v", "libx264", "-preset", env.FFMPEG_PRESET, "-profile:v", "high",
    "-force_key_frames", `expr:gte(t,n_forced*${SEGMENT_SECONDS})`, "-sc_threshold", "0",
  );
  if (info.hasAudio) args.push("-c:a", "aac", "-b:a", "128k", "-ac", "2");
  args.push(
    "-f", "hls",
    "-hls_time", String(SEGMENT_SECONDS),
    "-hls_playlist_type", "vod",
    "-hls_flags", "independent_segments",
    "-hls_segment_filename", `${out}/%v/seg_%d.ts`,
    "-master_pl_name", "master.m3u8",
    "-var_stream_map", ladder.map((r, i) => (info.hasAudio ? `v:${i},a:${i},name:${r.height}p` : `v:${i},name:${r.height}p`)).join(" "),
    `${out}/%v/index.m3u8`,
  );
  await run(env.FFMPEG_PATH, args);

  // The picture shown before playback starts (like a YouTube thumbnail).
  const at = Math.min(1, Math.max(info.durationSec / 3, 0));
  await run(env.FFMPEG_PATH, ["-v", "error", "-y", "-ss", String(at), "-i", input, "-frames:v", "1", "-vf", "scale=-2:720", "-q:v", "3", path.join(outDir, "poster.jpg")]);
  return { ...info, renditions: ladder.map((r) => r.height) };
};

/** Every file below dir as a path relative to it, with "/" separators. */
export const listFiles = async (dir: string, prefix = ""): Promise<string[]> => {
  const out: string[] = [];
  for (const entry of await fsp.readdir(dir, { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...(await listFiles(path.join(dir, entry.name), rel)));
    else out.push(rel);
  }
  return out;
};
