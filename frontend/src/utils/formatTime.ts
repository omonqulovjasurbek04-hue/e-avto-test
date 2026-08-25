/**
 * Converts seconds into mm:ss format.
 * Example: 125 -> "02:05", 3600 -> "60:00"
 */
export function formatSecondsToTimer(totalSeconds: number): string {
  if (isNaN(totalSeconds) || totalSeconds < 0) return "00:00";
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const mm = String(minutes).padStart(2, "0");
  const ss = String(seconds).padStart(2, "0");
  return `${mm}:${ss}`;
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
