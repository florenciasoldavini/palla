import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import { sharedSession } from "../src/server/session-sharing/repository";
import { injectSessionMetadata } from "../src/server/session-sharing/metadata";
export async function GET(request: Request) {
  const headers = {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  };
  const id = new URL(request.url).searchParams.get("id");
  const unavailable = () =>
    new Response(
      '<!doctype html><html lang="en"><head><title>Session unavailable | Palla</title><meta name="robots" content="noindex"></head><body><h1>Session unavailable</h1><p>This session is private, removed, or no longer available.</p></body></html>',
      { status: 404, headers }
    );
  if (!z.uuid().safeParse(id).success) return unavailable();
  try {
    const session = await sharedSession(id!);
    if (!session) return unavailable();
    const template = await readFile(
      join(process.cwd(), "dist/session.html"),
      "utf8"
    );
    return new Response(injectSessionMetadata(template, session), { headers });
  } catch {
    return new Response("Session temporarily unavailable. Please try again.", {
      status: 503,
      headers: { ...headers, "Retry-After": "30" }
    });
  }
}
export async function HEAD(request: Request) {
  const response = await GET(request);
  return new Response(null, {
    status: response.status,
    headers: response.headers
  });
}
