import React, { useRef, useEffect } from "react";

export default function HeroVideoBackground() {
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

    playVideo();

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
    <div className="absolute inset-0 -z-10 overflow-hidden bg-slate-950">
      {/* Video Element */}
      <video
        ref={videoRef}
        src="/video/car.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="h-full w-full object-cover scale-105"
      />

      {/* PARDA 1: Dark Slate Base Overlay */}
      <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-[1px]" />

      {/* PARDA 2: Horizontal Left-to-Right Reading Gradient */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/85 to-slate-950/50" />

      {/* PARDA 3: Top and Bottom Seamless Blends */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/80" />

      {/* Ambient Neon Lighting */}
      <div className="absolute top-1/3 left-1/4 h-96 w-96 rounded-full bg-brand-600/25 blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-1/4 h-72 w-72 rounded-full bg-indigo-600/20 blur-3xl pointer-events-none" />
    </div>
  );
}
