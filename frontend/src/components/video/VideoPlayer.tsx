import { useRef, useState, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize } from "lucide-react";
import { cn } from "@/utils/cn";
import { formatTime } from "@/utils/formatTime";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
  /** Called with the watched percentage (0-100) roughly every 10% and on completion. */
  onProgress?: (percent: number) => void;
  /**
   * For short-lived signed URLs: called shortly before the link expires; the returned URL replaces the source
   * while keeping the playback position and play/pause state.
   */
  refreshSrc?: () => Promise<string>;
  refreshAfterMs?: number;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export default function VideoPlayer({ src, poster, className, onProgress, refreshSrc, refreshAfterMs = 240_000 }: VideoPlayerProps) {
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
  const reported = useRef(0);
  const onProgressRef = useRef(onProgress);
  onProgressRef.current = onProgress;

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => {
      setCurrent(v.currentTime);
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
    const onEnded = () => {
      setPlaying(false);
      reported.current = 100;
      onProgressRef.current?.(100);
    };
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onLoaded);
    v.addEventListener("ended", onEnded);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("ended", onEnded);
    };
  }, []);

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

  const fullscreen = () => {
    videoRef.current?.requestFullscreen?.();
  };

  if (error) {
    return (
      <div className="flex aspect-video items-center justify-center rounded-xl bg-slate-100 text-sm text-slate-500 dark:bg-slate-800">
        Videoni yuklashda xatolik yuz berdi.
      </div>
    );
  }

  return (
    <div className={cn("overflow-hidden rounded-xl bg-black", className)}>
      <video
        ref={videoRef}
        src={activeSrc}
        poster={poster}
        className="aspect-video w-full"
        onClick={toggle}
        onError={() => setError(true)}
        playsInline
      />
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

        <button onClick={fullscreen} aria-label="Fullscreen">
          <Maximize className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}
