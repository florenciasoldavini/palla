export function sessionShareContent(
  platform: string,
  session: { title: string; description?: string | null; url: string }
) {
  const summary = session.description
    ?.replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
  const message = [session.title, summary].filter(Boolean).join("\n");
  return platform === "ios"
    ? { title: session.title, message, url: session.url }
    : { title: session.title, message: `${message}\n${session.url}` };
}
