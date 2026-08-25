import React, { useRef, useEffect } from "react";
import { Gauge, ShieldCheck, Sparkles } from "lucide-react";

export default function HeroCarVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;

    const playVideo = () => {
      if (video.paused) {
        video.play().catch(() => {
          // Autoplay fallback
        });
      }
    };

    // Initial play
    playVideo();

    // Ensure continuous playback if tab becomes active again or on browser pause
    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        playVideo();
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    video.addEventListener("pause", playVideo);
    video.addEventListener("ended", playVideo);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      video.removeEventListener("pause", playVideo);
      video.removeEventListener("ended", playVideo);
    };
  }, []);

  return (
    <div className="relative w-full max-w-xl lg:max-w-none group">
      {/* Background Ambient Glow Behind Card */}
      <div className="absolute -inset-1.5 rounded-[2rem] bg-gradient-to-r from-brand-500 via-indigo-500 to-emerald-500 opacity-40 blur-2xl transition duration-1000 group-hover:opacity-75" />

      {/* Main Glass Card Frame */}
      <div className="relative overflow-hidden rounded-3xl border border-white/20 bg-slate-950/80 p-2.5 shadow-2xl backdrop-blur-2xl">
        {/* Video Inner Container */}
        <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-slate-950 shadow-inner">
          {/* Continuous Loop Video */}
          <video
            ref={videoRef}
            src="/video/car.mp4"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />

          {/* PARDA 1: Cinematic Vignette Overlay (Parda) */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-slate-950/40" />

          {/* PARDA 2: Glass Corner Glare & Soft Sheen (Parda) */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/15 via-transparent to-transparent opacity-80" />

          {/* PARDA 3: Side Shadow Blends (Parda) */}
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-r from-slate-950/40 via-transparent to-slate-950/40" />

          {/* Top HUD Badges */}
          <div className="absolute top-3.5 left-3.5 right-3.5 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-1.5 rounded-xl bg-slate-900/85 px-3 py-1.5 text-[11px] font-bold text-white backdrop-blur-md border border-white/10 shadow-lg">
              <Sparkles className="h-3.5 w-3.5 text-brand-400" />
              <span>YHQ 2026 Interaktiv Simulyator</span>
            </div>

            <div className="flex items-center gap-1.5 rounded-xl bg-emerald-950/80 px-2.5 py-1 text-[11px] font-bold text-emerald-300 backdrop-blur-md border border-emerald-500/30 shadow-lg">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
              <span>Doimiy Jonli</span>
            </div>
          </div>

          {/* Bottom HUD Badges & Information */}
          <div className="absolute bottom-3.5 left-3.5 right-3.5 flex items-center justify-between pointer-events-none">
            <div className="flex items-center gap-2 rounded-xl bg-slate-900/90 px-3.5 py-1.5 text-xs font-bold text-white backdrop-blur-md border border-white/15 shadow-xl">
              <Gauge className="h-4 w-4 text-emerald-400" />
              <span>Tezlik: 60 km/soat</span>
              <span className="text-[10px] text-slate-400 font-normal">| Shahar</span>
            </div>

            <div className="flex items-center gap-1.5 rounded-xl bg-brand-950/80 px-3 py-1.5 text-xs font-bold text-brand-300 backdrop-blur-md border border-brand-500/30 shadow-xl">
              <ShieldCheck className="h-3.5 w-3.5 text-brand-400" />
              <span>100% Rasmiy Qoidalar</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
