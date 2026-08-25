import { useRef, useState, useEffect } from "react";
import { Play, Pause, Volume2, VolumeX, Maximize, RotateCcw } from "lucide-react";
import { cn } from "@/utils/cn";
import { formatTime } from "@/utils/formatTime";

interface VideoPlayerProps {
  src: string;
  poster?: string;
  className?: string;
}

const SPEEDS = [0.75, 1, 1.25, 1.5, 2];

export default function VideoPlayer({ src, poster, className }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [error, setError] = useState(false);

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => setCurrent(v.currentTime);
    const onLoaded = () => setDuration(v.duration || 0);
    const onEnded = () => setPlaying(false);
    v.addEventListener("timeupdate", onTime);
    v.addEventListener("loadedmetadata", onLoaded);
    v.addEventListener("ended", onEnded);
    return () => {
      v.removeEventListener("timeupdate", onTime);
      v.removeEventListener("loadedmetadata", onLoaded);
      v.removeEventListener("ended", onEnded);
    };
  }, []);

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
        src={src}
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
