// Local-only HTTP harness for the actual Vercel handlers. Not part of app runtime.
import http from "node:http";
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import { resolve, extname } from "node:path";
import { createServer } from "vite";
try {
  process.loadEnvFile(".env.local");
} catch {}
if (process.env.SESSION_SHARE_ANON_FILE)
  process.env.SESSION_SHARE_SUPABASE_ANON_KEY = (
    await readFile(process.env.SESSION_SHARE_ANON_FILE, "utf8")
  ).trim();
const vite = await createServer({
  server: {
    middlewareMode: true,
    watch: { ignored: ["**/android/**", "**/ios/**", "**/.impeccable/**"] }
  },
  appType: "custom"
});
const root = resolve("dist");
const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, "http://127.0.0.1:8084");
    let route;
    if (url.pathname === "/session") route = "/api/session.ts";
    else if (url.pathname === "/api/session-image")
      route = "/api/session-image.ts";
    else if (url.pathname.startsWith("/.well-known/")) {
      route = "/api/app-links.ts";
      url.searchParams.set(
        "platform",
        url.pathname.endsWith("assetlinks.json") ? "android" : "ios"
      );
    }
    if (route) {
      const handler = await vite.ssrLoadModule(route);
      const response = await (
        req.method === "HEAD" && handler.HEAD ? handler.HEAD : handler.GET
      )(new Request(url));
      res.writeHead(response.status, Object.fromEntries(response.headers));
      res.end(
        req.method === "HEAD"
          ? undefined
          : Buffer.from(await response.arrayBuffer())
      );
      console.log(req.method, url.pathname, response.status);
    } else {
      const path = resolve(
        root,
        "." +
          decodeURIComponent(
            url.pathname === "/" ? "/index.html" : url.pathname
          )
      );
      if (!path.startsWith(root + "/")) throw new Error("Invalid path");
      const mime =
        {
          ".js": "application/javascript",
          ".css": "text/css",
          ".png": "image/png",
          ".ttf": "font/ttf",
          ".html": "text/html"
        }[extname(path)] ?? "application/octet-stream";
      const body = await readFile(path);
      res.writeHead(200, { "Content-Type": mime });
      res.end(req.method === "HEAD" ? undefined : body);
    }
  } catch {
    if (!res.headersSent) res.writeHead(404);
    res.end("Local sharing resource unavailable");
  }
});
server.listen(8084, "0.0.0.0", () =>
  console.log("Session sharing test server: http://127.0.0.1:8084")
);
