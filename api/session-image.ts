import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { z } from "zod";
import {
  sharedSession,
  sharedCover,
  permittedCoverUrl
} from "../src/server/session-sharing/repository";
import { escapeHtml } from "../src/server/session-sharing/metadata";

async function boundedImage(response: Response) {
  if (
    !response.ok ||
    !response.headers.get("content-type")?.startsWith("image/")
  )
    throw new Error("Invalid cover");
  const reader = response.body!.getReader();
  const chunks: Uint8Array[] = [];
  let length = 0;
  try {
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      length += value.length;
      if (length > 5 * 1024 * 1024) throw new Error("Cover too large");
      chunks.push(value);
    }
  } finally {
    await reader.cancel();
  }
  return Buffer.concat(chunks);
}
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  const headers = {
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff"
  };
  if (!z.uuid().safeParse(id).success)
    return new Response(null, { status: 404, headers });
  try {
    if (!(await sharedSession(id!)))
      return new Response(null, { status: 404, headers });
    let bytes: Buffer;
    try {
      const cover = await sharedCover(id!);
      if (!cover.url || !permittedCoverUrl(cover.url, cover.source))
        throw new Error("No cover");
      const source = await boundedImage(
        await fetch(cover.url, {
          redirect: "error",
          signal: AbortSignal.timeout(8000),
          cache: "no-store"
        })
      );
      if (cover.source === "google") {
        // Required credits remain in the shared bitmap, even outside the app.
        const credit = `Google Maps · Photo: ${cover.authors.map((a) => a.name).join(", ") || "Google Maps contributors"}`;
        if (credit.length > 600) throw new Error("Attribution cannot fit");
        const lines = credit.match(/.{1,100}(?:\s|$)|.{1,100}/g) ?? [credit];
        const footer = Buffer.from(
          `<svg width="1200" height="150"><rect width="1200" height="150" fill="white"/><text font-family="sans-serif" font-size="18" fill="#333">${lines.map((line, i) => `<tspan x="24" y="${26 + i * 21}">${escapeHtml(line)}</tspan>`).join("")}</text></svg>`
        );
        const photo = await sharp(source, { limitInputPixels: 20000000 })
          .resize(1200, 480, { fit: "contain", background: "#fff" })
          .toBuffer();
        bytes = await sharp({
          create: { width: 1200, height: 630, channels: 3, background: "#fff" }
        })
          .composite([
            { input: photo, top: 0, left: 0 },
            { input: footer, top: 480, left: 0 }
          ])
          .jpeg({ quality: 88 })
          .toBuffer();
      } else
        bytes = await sharp(source, { limitInputPixels: 20000000 })
          .resize(1200, 630, { fit: "cover" })
          .jpeg({ quality: 88 })
          .toBuffer();
    } catch {
      bytes = await sharp(
        await readFile(join(process.cwd(), "public/og/palla-og-cover.png"))
      )
        .resize(1200, 630)
        .jpeg({ quality: 88 })
        .toBuffer();
    }
    return new Response(new Uint8Array(bytes), {
      headers: { ...headers, "Content-Type": "image/jpeg" }
    });
  } catch {
    return new Response(null, {
      status: 503,
      headers: { ...headers, "Retry-After": "30" }
    });
  }
}
