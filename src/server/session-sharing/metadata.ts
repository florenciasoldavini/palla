import { sessionOrigin } from "../../config/session-links";
import type { SharedSession } from "./repository";
export const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!
  );
export function sessionDescription(s: SharedSession) {
  const description = s.description?.replace(/\s+/g, " ").trim();
  if (description)
    return description.length > 240
      ? `${description.slice(0, 237)}…`
      : description;
  const date = new Intl.DateTimeFormat("en-GB", {
    timeZone: s.timezone,
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(s.starts_at));
  return [date, s.venue.name, `Hosted by ${s.host.name}`]
    .filter(Boolean)
    .join(" · ");
}
export function sessionMetadata(s: SharedSession) {
  const origin = sessionOrigin(process.env.EXPO_PUBLIC_SESSION_SHARE_URL);
  const url = `${origin}/session?id=${s.id}`;
  const image = `${origin}/api/session-image?id=${s.id}`;
  const title = escapeHtml(s.title),
    description = escapeHtml(sessionDescription(s));
  return `<title>${title} | Palla</title>
<meta name="description" content="${description}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Palla">
<meta property="og:title" content="${title}">
<meta property="og:description" content="${description}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${image}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${title} — session cover">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${title}">
<meta name="twitter:description" content="${description}">
<meta name="twitter:image" content="${image}">
<meta name="twitter:image:alt" content="${title} — session cover">`;
}
export function injectSessionMetadata(
  template: string,
  session: SharedSession
) {
  return template
    .replace(/<title\b[^>]*>[\s\S]*?<\/title>/gi, "")
    .replace(
      /<meta\b[^>]*(?:name|property)=["'](?:description|og:[^"']*|twitter:[^"']*)["'][^>]*>/gi,
      ""
    )
    .replace(/<link\b[^>]*rel=["']canonical["'][^>]*>/gi, "")
    .replace("</head>", `${sessionMetadata(session)}</head>`);
}
