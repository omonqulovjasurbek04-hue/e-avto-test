import { useEffect, useRef, type ReactNode } from "react";
import { motion } from "framer-motion";

/**
 * Full-bleed cinematic hero: the car video fills the whole section (no wash, fade or mask), and the
 * white text sits directly on top of it in both themes.
 */
export default function HeroCinematic({ eyebrow, title, subtitle, actions }: { eyebrow: string; title: string; subtitle: string; actions: ReactNode }) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    // Users who ask for less motion get the still poster instead of a playing video.
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      video.pause();
      return;
    }
    video.muted = true;
    const play = () => {
      if (video.paused) video.play().catch(() => {});
    };
    play();
    const onVisible = () => document.visibilityState === "visible" && play();
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);

  return (
    <section className="relative isolate overflow-hidden bg-slate-950 text-white">
      {/* Media: the dark night video fills the whole section edge to edge, with no wash or mask over it. */}
      <video
        ref={videoRef}
        src="/video/hero.mp4"
        poster="/images/hero-poster.jpg"
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        aria-hidden="true"
        className="absolute inset-0 -z-10 h-full w-full object-cover object-[70%_center] lg:object-center"
      />

      <div className="container-page relative flex min-h-[560px] items-center py-20 lg:min-h-[640px] lg:py-28">
        {/* The video is dark in both themes, so the text is always white; a soft shadow keeps it crisp over bright lights. */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-xl space-y-6 [text-shadow:0_2px_12px_rgba(0,0,0,0.6)]">
          <p className="text-xs font-bold uppercase tracking-[0.25em] text-sky-300">{eyebrow}</p>
          <h1 className="text-4xl font-bold leading-[1.1] tracking-tight sm:text-5xl lg:text-6xl">{title}</h1>
          <p className="max-w-lg text-base leading-relaxed text-slate-200 sm:text-lg">{subtitle}</p>
          <div className="flex flex-wrap items-center gap-4 pt-2">{actions}</div>
        </motion.div>
      </div>
    </section>
  );
}
