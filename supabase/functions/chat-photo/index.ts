import jpeg from "npm:jpeg-js@0.4.4";
import { createClient } from "npm:@supabase/supabase-js@2.50.3";
import { jpegDimensions, MAX_PHOTO_BYTES } from "./image.ts";
const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers });
const uuid = (v: unknown): v is string =>
  typeof v === "string" &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    v
  );
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers });
  if (req.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  const url = Deno.env.get("SUPABASE_URL"),
    key = Deno.env.get("SUPABASE_ANON_KEY"),
    secret = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key || !secret) return json({ error: "unavailable" }, 503);
  const authorization = req.headers.get("Authorization") ?? "";
  const client = createClient(url, key, {
    global: { headers: { Authorization: authorization } },
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user || auth.user.is_anonymous)
    return json({ error: "sign_in" }, 401);
  const actor = auth.user.id;
  const admin = createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false }
  });
  const bucket = admin.storage.from("chat-attachments");
  const cleanup = async () => {
    const { data, error } = await admin.rpc("chat_photo_cleanup_candidates", {
      p_actor: actor
    });
    if (error || !data?.length) return;
    const removed = await bucket.remove(
      data.map((x: { storage_path: string }) => x.storage_path)
    );
    if (!removed.error)
      await admin.rpc("complete_chat_photo_cleanup", {
        p_actor: actor,
        p_ids: data.map((x: { id: string }) => x.id)
      });
  };
  try {
    const reader = req.body?.getReader();
    if (!reader) return json({ error: "invalid_request" }, 400);
    const chunks: Uint8Array[] = [];
    let total = 0;
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      total += part.value.length;
      if (total > Math.ceil((MAX_PHOTO_BYTES * 4) / 3) + 10000) {
        await reader.cancel();
        return json({ error: "invalid_photo" }, 413);
      }
      chunks.push(part.value);
    }
    const raw = new Uint8Array(total);
    let pos = 0;
    for (const chunk of chunks) {
      raw.set(chunk, pos);
      pos += chunk.length;
    }
    const text = new TextDecoder().decode(raw);
    if (text.length > Math.ceil((MAX_PHOTO_BYTES * 4) / 3) + 10000)
      return json({ error: "invalid_photo" }, 413);
    let input: Record<string, any>;
    try {
      input = JSON.parse(text);
    } catch {
      return json({ error: "invalid_request" }, 400);
    }
    if (!input || typeof input !== "object" || Array.isArray(input))
      return json({ error: "invalid_request" }, 400);
    if (input.op === "cleanup") {
      await cleanup();
      return json({ ok: true });
    }
    if (!uuid(input.id)) return json({ error: "invalid_request" }, 400);
    if (input.op === "access") {
      const { data: path, error } = await admin.rpc("get_chat_photo_access", {
        p_actor: actor,
        p_id: input.id
      });
      if (error || !path) return json({ error: "unavailable" }, 403);
      const signed = await bucket.createSignedUrl(path, 60);
      if (signed.error) return json({ error: "unavailable" }, 503);
      return json({ url: signed.data.signedUrl });
    }
    if (
      input.op !== "send" ||
      !uuid(input.conversation_id) ||
      typeof input.body !== "string" ||
      input.body.length > 4000 ||
      (input.reply_to_id != null && !uuid(input.reply_to_id)) ||
      typeof input.base64 !== "string" ||
      !/^[A-Za-z0-9+/]*={0,2}$/.test(input.base64)
    )
      return json({ error: "invalid_request" }, 400);
    // Charge every processing attempt, including retries, before decoding JPEGs.
    const preflight = await admin.rpc("authorize_chat_photo_processing", {
      p_actor: actor,
      p_conversation_id: input.conversation_id
    });
    if (preflight.error || preflight.data !== true)
      return json(
        {
          error:
            preflight.error?.code === "54000" ? "limit_reached" : "not_allowed"
        },
        preflight.error?.code === "54000" ? 429 : 403
      );
    let bytes = Uint8Array.from(atob(input.base64), (c) => c.charCodeAt(0));
    let dimensions: { width: number; height: number };
    try {
      dimensions = jpegDimensions(bytes);
      if (dimensions.width > 2048 || dimensions.height > 2048)
        throw Error("invalid_photo");
      const decoded = jpeg.decode(bytes, {
        useTArray: true,
        maxResolutionInMP: 5,
        maxMemoryUsageInMB: 64
      });
      bytes = new Uint8Array(
        jpeg.encode(
          { width: decoded.width, height: decoded.height, data: decoded.data },
          85
        ).data
      );
      if (bytes.length > MAX_PHOTO_BYTES) throw Error("invalid_photo");
    } catch {
      return json({ error: "invalid_photo" }, 400);
    }
    const hash = Array.from(
      new Uint8Array(await crypto.subtle.digest("SHA-256", bytes))
    )
      .map((x) => x.toString(16).padStart(2, "0"))
      .join("");
    const prepared = await admin.rpc("prepare_chat_photo", {
      p_actor: actor,
      p_id: input.id,
      p_conversation_id: input.conversation_id,
      p_body: input.body,
      p_hash: hash,
      p_reply_to_id: input.reply_to_id ?? null
    });
    if (prepared.error)
      return json(
        {
          error:
            prepared.error.code === "54000" ? "limit_reached" : "not_allowed"
        },
        prepared.error.code === "54000" ? 429 : 403
      );
    if (prepared.data.message) return json({ message: prepared.data.message });
    const path = prepared.data.path;
    const uploaded = await bucket.upload(path, bytes, {
      contentType: "image/jpeg",
      upsert: false
    });
    if (uploaded.error) {
      const existing = await bucket.download(path);
      if (existing.error || !existing.data)
        return json({ error: "unavailable" }, 503);
      const old = new Uint8Array(await existing.data.arrayBuffer());
      if (
        old.length !== bytes.length ||
        old.some((byte, i) => byte !== bytes[i])
      )
        return json({ error: "identity_conflict" }, 409);
    }
    const saved = await admin.rpc("finish_chat_photo", {
      p_actor: actor,
      p_id: input.id,
      p_size: bytes.length,
      p_width: dimensions.width,
      p_height: dimensions.height
    });
    if (saved.error)
      return json(
        {
          error: saved.error.code === "54000" ? "limit_reached" : "not_allowed"
        },
        saved.error.code === "54000" ? 429 : 403
      );
    await cleanup().catch(() => undefined);
    return json({ message: saved.data });
  } catch {
    return json({ error: "unavailable" }, 503);
  }
});
