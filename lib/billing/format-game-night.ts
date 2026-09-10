export function formatGameNightEnd(iso: string, now = new Date()): string {
  const end = new Date(iso);
  if (Number.isNaN(end.getTime())) return "";
  const time = end.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (endDay.getTime() - today.getTime()) / 86_400_000,
  );
  if (diffDays === 0) return `Ends today at ${time}`;
  if (diffDays === 1) return `Ends tomorrow at ${time}`;
  return `Ends ${end.toLocaleDateString(undefined, { month: "short", day: "numeric" })} at ${time}`;
}
