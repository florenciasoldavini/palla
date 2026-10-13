export function getUserHomePath(user: {
  preferred_mode: "player" | "organizer";
  organizer_status: "active" | "suspended" | null;
}) {
  return user.preferred_mode === "organizer" &&
    user.organizer_status === "active"
    ? "/dashboard"
    : "/discover";
}
