export function waitlistJoinedLabel(joinedAt: string, now = Date.now()) {
  const minutes = Math.max(0, Math.floor((now - Date.parse(joinedAt)) / 60000));
  if (minutes < 1) return "Joined just now";
  if (minutes < 60) return `Joined ${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `Joined ${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `Joined ${days}d ago`;
}
