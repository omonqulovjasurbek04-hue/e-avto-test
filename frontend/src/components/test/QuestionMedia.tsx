/** A question's picture or short video (the same field holds either; a video is told by its extension). */
export const isVideoUrl = (url: string) => /\.(mp4|webm|ogg|mov)(?:$|[?#])/i.test(url);

export function QuestionMedia({ url, className }: { url: string; className?: string }) {
  return isVideoUrl(url) ? (
    <video src={url} controls playsInline preload="metadata" className={className ? `${className} bg-black` : "bg-black"} />
  ) : (
    <img src={url} alt="" className={className} />
  );
}
