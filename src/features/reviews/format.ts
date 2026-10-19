export const reviewDate = (date: string) =>
  new Date(date).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short"
  });

// Use the session's timezone, including when the reviewer travels afterwards.
export function reviewSessionDate(context: {
  starts_at: string;
  timezone: string;
}) {
  return new Date(context.starts_at).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    timeZone: context.timezone
  });
}
export function reviewSessionTime(context: {
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
