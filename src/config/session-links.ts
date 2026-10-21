import { origin as DEFAULT_SESSION_ORIGIN } from "./session-link-defaults.json";
function sessionOrigin(value?: string) {
  const url = new URL(value?.trim() || DEFAULT_SESSION_ORIGIN);
  const local =
    ["localhost", "127.0.0.1", "[::1]", "0.0.0.0"].includes(url.hostname) ||
    url.hostname.endsWith(".localhost");
  if (local) return DEFAULT_SESSION_ORIGIN;
  if (url.protocol !== "https:")
    throw new Error("Session sharing requires HTTPS.");
  return url.origin;
}
export { DEFAULT_SESSION_ORIGIN, sessionOrigin };
