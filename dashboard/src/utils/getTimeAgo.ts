export function getTimeAgo(timestamp: string) {
  const now = new Date().getTime();
  const past = new Date(timestamp).getTime();
  const diffInSeconds = Math.floor((now - past) / 1000);

  if (diffInSeconds < 60) return "just now";

  const d = Math.floor(diffInSeconds / 86400);
  const h = Math.floor((diffInSeconds % 86400) / 3600);
  const m = Math.floor((diffInSeconds % 3600) / 60);

  if (d > 0) return `${d}d ago`;
  if (h > 0 && m > 0) return `${h}h${m}m ago`;
  if (h > 0) return `${h}h ago`;
  return `${m}m ago`;
}
