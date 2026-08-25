export function formatDate(dateString?: string | null): string {
  if (!dateString) return "";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat("uz-UZ", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(d);
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString?: string | null): string {
  if (!dateString) return "";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return new Intl.DateTimeFormat("uz-UZ", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(d);
  } catch {
    return dateString;
  }
}
