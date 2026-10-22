import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { mediaService, type VideoSource } from "@/services/platform.service";
import { Skeleton } from "@/components/ui/Skeleton";
import { Alert } from "@/components/ui/Alert";
import VideoPlayer from "@/components/video/VideoPlayer";

/**
 * Plays a video from private storage through signed URLs: an adaptive HLS stream (quality follows the
 * connection, like YouTube) or, for older uploads, one MP4 file whose short-lived link is renewed while watching.
 */
export default function LessonVideo({ videoId, onProgress, onWatch }: { videoId: string; onProgress?: (pct: number) => void; onWatch?: (seconds: number, position: number) => void }) {
  const { t } = useTranslation();
  const [source, setSource] = useState<VideoSource | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let alive = true;
    setSource(null);
    setFailed(false);
    mediaService.videoSource(videoId).then((s) => alive && setSource(s)).catch(() => alive && setFailed(true));
    return () => {
      alive = false;
    };
  }, [videoId]);

  if (failed) return <Alert variant="danger">{t("lock.privateFail")}</Alert>;
  if (!source) return <Skeleton className="aspect-video w-full" />;
  if (source.type === "hls") return <VideoPlayer hls src={source.url} poster={source.poster} onProgress={onProgress} onWatch={onWatch} />;
  return <VideoPlayer src={source.url} onProgress={onProgress} onWatch={onWatch} refreshSrc={() => mediaService.streamUrl("video", videoId)} />;
}

