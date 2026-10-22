import { useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Play, Pause, Volume2, VolumeX, Maximize, Loader2 } from "lucide-react";
import type HlsType from "hls.js";
import { cn } from "@/utils/cn";
import { formatTime } from "@/utils/formatTime";

interface VideoPlayerProps {
  src: string;
  /**
   * The source is an HLS master playlist (adaptive, like YouTube): played with hls.js, which loads
   * short segments and picks the quality the connection can carry; Safari plays it natively.
   */
  hls?: boolean;
  poster?: string;
  className?: string;
  /** Called with the watched percentage (0-100) roughly every 10% and on completion. */
  onProgress?: (percent: number) => void;
  /**
   * Heartbeat with the seconds really played since the last call (jumps by seeking are not counted)
   * and the current position: about every 10 s of playback, on pause and at the end.
   */
  onWatch?: (seconds: number, position: number) => void;
  /**
   * For short-lived signed URLs: called shortly before the link expires; the returned URL replaces the source
   * while keeping the playback position and play/pause state.
   */
  refreshSrc?: () => Promise<string>;
  refreshAfterMs?: number;
  /**
   * Text drawn over the picture (e.g. the viewer's e-mail/phone), so a screen recording shows who leaked it.
   * It moves every few seconds and stays visible in fullscreen. A deterrent, not DRM.
   */
  watermark?: string;
}

// Spots the watermark jumps between (percent of the frame), away from the controls.
const SPOTS = [
  { top: 8, left: 6 }, { top: 12, left: 58 }, { top: 42, left: 30 }, { top: 66, left: 8 }, { top: 70, left: 55 }, { top: 30, left: 70 },
];

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

/** -1 = automatic quality (hls.js chooses by bandwidth); otherwise an hls.js level index. */
const AUTO = -1;

/** The familiar name of a picture height: a 1072px source is "1080p", like on YouTube. */
const STANDARD = [2160, 1440, 1080, 720, 480, 360, 240, 144];
const qualityName = (h: number) => `${STANDARD.reduce((best, s) => (Math.abs(s - h) < Math.abs(best - h) ? s : best), STANDARD[0])}p`;

export default function VideoPlayer({ src, hls = false, poster, className, onProgress, onWatch, refreshSrc, refreshAfterMs = 240_000, watermark }: VideoPlayerProps) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const [spot, setSpot] = useState(0);
  useEffect(() => {
    if (!watermark) return;
    const timer = setInterval(() => setSpot((i) => (i + 1 + Math.floor(Math.random() * (SPOTS.length - 1))) % SPOTS.length), 7000);
    return () => clearInterval(timer);
  }, [watermark]);
  const [activeSrc, setActiveSrc] = useState(src);
  const resume = useRef<{ time: number; play: boolean } | null>(null);
  useEffect(() => setActiveSrc(src), [src]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const speedRef = useRef(1);
  speedRef.current = speed;
  const [error, setError] = useState(false);
  const [buffering, setBuffering] = useState(false);
  // Adaptive streaming: available heights (e.g. [1080, 720, 480, 360]), the chosen one, and what Auto picked.
  const hlsRef = useRef<HlsType | null>(null);
  const [levels, setLevels] = useState<number[]>([]);
  const [quality, setQuality] = useState(AUTO);
  const [autoHeight, setAutoHeight] = useState<number | null>(null);
  const reported = useRef(0);
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;
  const onWatchRef = useRef(onWatch);
  onWatchRef.current = onWatch;
  // Played time not reported yet, and the position at the previous timeupdate.
  const played = useRef(0);
  const lastTime = useRef(0);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const flush = () => {
      if (played.current <= 0) return;
      onWatchRef.current?.(played.current, v.currentTime);
      played.current = 0;
    };
    const onTime = () => {
      setCurrent(v.currentTime);
      // timeupdate fires ~4 times a second: a small forward step is playback, a jump is a seek.
      const step = v.currentTime - lastTime.current;
      lastTime.current = v.currentTime;
      if (!v.seeking && step > 0 && step <= 1.5 * Math.max(1, v.playbackRate)) played.current += step;
      if (played.current >= 10) flush();
      if (!v.duration) return;
      const pct = Math.floor((v.currentTime / v.duration) * 100);
      if (pct >= reported.current + 10) {
        reported.current = pct;
        onProgressRef.current?.(pct);
      }
    };
    const onLoaded = () => {
      setDuration(v.duration || 0);
      // After a link refresh, continue exactly where the viewer was.
      // A new source resets playbackRate to 1; keep the speed the viewer chose.
      v.playbackRate = speedRef.current;
      if (resume.current) {
        v.currentTime = resume.current.time;
        if (resume.current.play) void v.play().catch(() => undefined);
        resume.current = null;
      }
    };
    const onSeeked = () => {
      lastTime.current = v.currentTime;
    };
    const onPause = () => flush();
    const onEnded = () => {
      flush();
      setPlaying(false);
      reported.current = 100;
      onProgressRef.current?.(100);
    };
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onLoaded);
    v.addEventListener("ended", onEnded);
    v.addEventListener("seeked", onSeeked);
    v.addEventListener("pause", onPause);
    return () => {
      flush();
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("ended", onEnded);
      v.removeEventListener("seeked", onSeeked);
      v.removeEventListener("pause", onPause);
    };
  }, []);

  // HLS: hls.js (lazy-loaded, so pages without video do not pay for it) or the browser's own HLS (Safari).
  useEffect(() => {
    const v = videoRef.current;
    if (!hls || !v) return;
    let disposed = false;
    let instance: HlsType | null = null;
    // The light build (no subtitles / alternate audio, which lessons do not use) is about half the size.
    void import("hls.js/light").then(({ default: Hls }) => {
      if (disposed) return;
      if (!Hls.isSupported()) {
        if (v.canPlayType("application/vnd.apple.mpegurl")) v.src = activeSrc;
        else setError(true);
        return;
      }
      instance = new Hls({
        // Never fetch a 1080p picture for a 400px player; start conservatively and climb, like YouTube.
        capLevelToPlayerSize: true,
        startLevel: AUTO,
        abrEwmaDefaultEstimate: 2_000_000,
        // Keep ~30 s ahead (smooth on a weak connection) and drop what is long behind (memory on phones).
        maxBufferLength: 30,
        backBufferLength: 30,
      });
      hlsRef.current = instance;
      instance.on(Hls.Events.MANIFEST_PARSED, (_e, data) => setLevels(data.levels.map((l) => l.height)));
      instance.on(Hls.Events.LEVEL_SWITCHED, (_e, data) => setAutoHeight(instance?.levels[data.level]?.height ?? null));
      instance.on(Hls.Events.ERROR, (_e, data) => {
        if (!data.fatal) return;
        // A dropped connection or a stalled decoder is recovered instead of ending playback.
        if (data.type === Hls.ErrorTypes.NETWORK_ERROR) instance?.startLoad();
        else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) instance?.recoverMediaError();
        else setError(true);
      });
      instance.loadSource(activeSrc);
      instance.attachMedia(v);
    });
    return () => {
      disposed = true;
      instance?.destroy();
      hlsRef.current = null;
    };
  }, [hls, activeSrc]);

  // Loading spinner while the player waits for data (start, seek, slow network).
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const on = () => setBuffering(true);
    const off = () => setBuffering(false);
    v.addEventListener("waiting", on);
    v.addEventListener("seeking", on);
    v.addEventListener("playing", off);
    v.addEventListener("seeked", off);
    v.addEventListener("canplay", off);
    return () => {
      v.removeEventListener("waiting", on);
      v.removeEventListener("seeking", on);
      v.removeEventListener("playing", off);
      v.removeEventListener("seeked", off);
      v.removeEventListener("canplay", off);
    };
  }, []);

  const chooseQuality = (index: number) => {
    setQuality(index);
    // currentLevel switches at once (flushes the buffer), as YouTube does when the viewer picks a quality.
    if (hlsRef.current) hlsRef.current.currentLevel = index;
  };

  useEffect(() => {
    if (!refreshSrc) return;
    const timer = setInterval(() => {
      void refreshSrc()
        .then((next) => {
          const v = videoRef.current;
          resume.current = { time: v?.currentTime ?? 0, play: v ? !v.paused : false };
          setActiveSrc(next);
        })
        .catch(() => undefined); // keep the current link; an expired one shows the normal error state
    }, refreshAfterMs);
    return () => clearInterval(timer);
  }, [refreshSrc, refreshAfterMs]);

  const toggle = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play();
      setPlaying(true);
    } else {
      v.pause();
      setPlaying(false);
    }
  };

  const seek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = videoRef.current;
    if (!v) return;
    const t = Number(e.target.value);
    v.currentTime = t;
    setCurrent(t);
  };

  const changeVolume = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    setVolume(val);
    if (videoRef.current) videoRef.current.volume = val;
    setMuted(val === 0);
  };

  const toggleMute = () => {
    const v = videoRef.current;
    if (!v) return;
    v.muted = !v.muted;
    setMuted(v.muted);
  };

  const changeSpeed = (s: number) => {
    setSpeed(s);
    if (videoRef.current) videoRef.current.playbackRate = s;
  };

  // The whole player goes fullscreen (not just <video>), so the watermark and our controls stay on top.
  const fullscreen = () => {
    const el = containerRef.current;
    if (document.fullscreenElement) void document.exitFullscreen?.();
    else void el?.requestFullscreen?.();
  };

  if (error) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-500 dark:bg-slate-800">
        {t("video.loadError")}
      </div>
    );
  }

  return (
    <div ref={containerRef} className={cn("flex flex-col overflow-hidden rounded-xl bg-black", className)}>
      <div className="relative flex-1">
        <video
          ref={videoRef}
          src={hls ? undefined : activeSrc}
          poster={poster}
          preload="metadata"
          className="aspect-video h-full w-full"
          onClick={toggle}
          onError={() => setError(true)}
          onContextMenu={watermark ? (e) => e.preventDefault() : undefined}
          controlsList="nodownload"
          playsInline
        />
        {watermark && (
          <span
            data-testid="video-watermark"
            aria-hidden
            className="pointer-events-none absolute select-none whitespace-nowrap rounded px-2 py-1 font-mono text-xs text-white/40 transition-all duration-1000 sm:text-sm"
            style={{ top: `${SPOTS[spot].top}%`, left: `${SPOTS[spot].left}%`, textShadow: "0 0 3px rgba(0,0,0,0.6)" }}
          >
            {watermark}
          </span>
        )}
        {buffering && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
            <Loader2 className="h-10 w-10 animate-spin text-white/80" />
          </span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3 bg-slate-900 px-3 py-2 text-white">
        <button onClick={toggle} aria-label={playing ? "Pause" : "Play"}>
          {playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </button>
        <span className="text-xs tabular-nums">{formatTime(current)}</span>
        <input
          type="range"
          min={0}
          max={duration || 0}
          value={current}
          onChange={seek}
          className="h-1 flex-1 cursor-pointer accent-brand-500"
          aria-label="Progress"
        />
        <span className="text-xs tabular-nums">{formatTime(duration)}</span>

        <button onClick={toggleMute} aria-label="Mute">
          {muted ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.1}
          value={muted ? 0 : volume}
          onChange={changeVolume}
          className="h-1 w-20 cursor-pointer accent-brand-500"
          aria-label="Volume"
        />

        <select
          value={speed}
          onChange={(e) => changeSpeed(Number(e.target.value))}
          className="rounded bg-slate-800 px-1 py-0.5 text-xs text-white outline-none"
          aria-label="Tezlik"
        >
          {SPEEDS.map((s) => (
            <option key={s} value={s}>
              {s}x
            </option>
          ))}
        </select>

        {levels.length > 1 && (
          <select
            value={quality}
            onChange={(e) => chooseQuality(Number(e.target.value))}
            className="rounded bg-slate-800 px-1 py-0.5 text-xs text-white outline-none"
            aria-label={t("video.quality")}
          >
            <option value={AUTO}>{autoHeight ? `${t("video.auto")} (${qualityName(autoHeight)})` : t("video.auto")}</option>
            {levels
              .map((h, i) => ({ h, i }))
              .sort((a, b) => b.h - a.h)
              .map(({ h, i }) => (
                <option key={i} value={i}>
                  {qualityName(h)}
                </option>
              ))}
          </select>
        )}

        <button onClick={fullscreen} aria-label="Fullscreen">
          <Maximize className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
