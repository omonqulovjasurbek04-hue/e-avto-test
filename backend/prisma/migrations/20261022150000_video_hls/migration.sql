-- Adaptive (HLS) lesson videos next to single MP4 files.
CREATE TYPE "VideoFormat" AS ENUM ('MP4', 'HLS');
ALTER TABLE "video_assets" ADD COLUMN "format" "VideoFormat" NOT NULL DEFAULT 'MP4';
