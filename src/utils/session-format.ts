// Use the session's timezone, including when the reviewer travels afterwards.
export function sessionDate(context: { starts_at: string; timezone: string }) {
  return new Date(context.starts_at).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    timeZone: context.timezone
  });
}
export function sessionTime(context: {
  starts_at: string;
  ends_at: string;
  timezone: string;
}) {
  const time = (date: string) =>
    new Date(date).toLocaleTimeString(undefined, {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: context.timezone
    });
  return `${time(context.starts_at)}–${time(context.ends_at)}`;
}
