/**
 * Converts seconds into mm:ss, or h:mm:ss from one hour on. Fractions are dropped (a video reports 23.4357 s).
 * Example: 125 -> "02:05", 23.43 -> "00:23", 3909 -> "1:05:09"
 */
export function formatSecondsToTimer(totalSeconds: number): string {
  if (!Number.isFinite(totalSeconds) || totalSeconds < 0) return "00:00";
  const total = Math.floor(totalSeconds);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const ss = String(total % 60).padStart(2, "0");
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, "0")}:${ss}` : `${String(minutes).padStart(2, "0")}:${ss}`;
}

export const formatTime = formatSecondsToTimer;

/**
 * Converts minutes to friendly text: e.g. 90 -> "1 soat 30 daqiqa" or "45 daqiqa"
 */
export function formatMinutesToDuration(minutes: number): string {
  if (!minutes || minutes <= 0) return "0 daqiqa";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0 && mins > 0) {
    return `${hours} soat ${mins} daq`;
  } else if (hours > 0) {
    return `${hours} soat`;
  }
  return `${mins} daqiqa`;
}

export const formatDuration = formatMinutesToDuration;
