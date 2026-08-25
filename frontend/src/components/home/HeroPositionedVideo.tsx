import React, { useRef, useEffect } from "react";

export default function HeroPositionedVideo() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;

    const playVideo = () => {
      if (video.paused) {
        video.play().catch(() => {});
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
    <div className="absolute right-0 top-0 bottom-0 w-full lg:w-[60%] xl:w-[54%] overflow-hidden pointer-events-none z-0">
      {/* Background Video */}
      <video
        ref={videoRef}
        src="/video/car.mp4"
        autoPlay
        loop
        muted
        playsInline
        preload="auto"
        className="h-full w-full object-cover object-center scale-105 opacity-90"
      />

      {/* PARDA 1: Left-to-Right Horizontal Gradient Fade */}
      <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/80 to-slate-950/20" />

      {/* PARDA 2: Vertical Top and Bottom Gradient Blends */}
      <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/70" />

      {/* PARDA 3: Extra Left Side Blur Mask for Text Readability */}
      <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-slate-950 to-transparent" />

      {/* Ambient Neon Lighting */}
      <div className="absolute top-1/3 right-1/4 h-80 w-80 rounded-full bg-brand-500/20 blur-3xl" />
      <div className="absolute bottom-10 right-10 h-64 w-64 rounded-full bg-indigo-500/20 blur-3xl" />
    </div>
  );
}
