import { useRef, useEffect } from "react";

/** Hero video shown as a framed card (glow, gradient hairline, soft shadow) instead of a faded background. */
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
    <div className="relative mx-auto w-full max-w-xl lg:max-w-none">
      {/* Glow behind the card */}
      <div className="pointer-events-none absolute -inset-6 rounded-[2.5rem] bg-gradient-to-tr from-brand-400/30 via-brand-200/20 to-amber-200/30 blur-2xl dark:from-brand-600/30 dark:via-indigo-500/15 dark:to-transparent" />

      {/* Gradient hairline frame */}
      <div className="relative rounded-[2rem] bg-gradient-to-br from-white via-brand-100 to-brand-300/60 p-[1.5px] shadow-2xl shadow-brand-900/15 dark:from-white/25 dark:via-white/5 dark:to-brand-500/40 dark:shadow-black/40">
        <div className="relative overflow-hidden rounded-[calc(2rem-1.5px)] bg-slate-900">
          <video
            ref={videoRef}
            src="/video/car.mp4"
            autoPlay
            loop
            muted
            playsInline
            preload="auto"
            className="aspect-[16/11] w-full object-cover"
          />
          <div className="pointer-events-none absolute inset-0 rounded-[calc(2rem-1.5px)] ring-1 ring-inset ring-white/15" />
        </div>
      </div>
    </div>
  );
}
