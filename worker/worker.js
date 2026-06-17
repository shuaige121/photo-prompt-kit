// img2-counter — shared cross-device coordinator for image generation.
//  Counter:  POST /report {device,date,count} · GET /day · GET /week
//  Cooldown: POST /gen {device} · GET /check         (sliding window, see below)
//  Lock/state machine (NEW — prevents concurrent codex runs that race the OAuth refresh):
//    POST /claim     {device, task, ttl?}  -> acquire the single generation lease (who/when/what)
//    POST /heartbeat {lease_id, ttl?}      -> extend your lease during a long batch
//    POST /release   {lease_id}            -> give it back
//    GET  /state                           -> {lease: who/when/what, free, cooldown}
//  One worker = one source of truth for "who is generating right now + the cooldown".
const THRESH = 12;
const WINDOW_MIN = 45;
const WINDOW_MS = WINDOW_MIN * 60000;

export default {
  async fetch(req, env) {
    const auth = req.headers.get("authorization") || "";
    if (auth !== `Bearer ${env.AUTH_TOKEN}`) return new Response("unauthorized", { status: 401 });
    const url = new URL(req.url);
    const now = Date.now();

    // ---------- cooldown (sliding window, event-anchored) ----------
    const getRecent = async () => {
      const raw = await env.KV.get("gen:recent");
      const cutoff = now - WINDOW_MS - 600000;
      return (raw ? JSON.parse(raw) : []).filter((t) => t >= cutoff).sort((a, b) => a - b);
    };
    const cooldownStatus = async () => {
      const win = (await getRecent()).filter((t) => t >= now - WINDOW_MS);
      const n = win.length;
      const hit = n >= THRESH;
      const cdUntil = hit ? win[n - THRESH] + WINDOW_MS : 0;
      const inCd = now < cdUntil;
      return {
        safe: !inCd, in_cooldown: inCd, cooldown_until: inCd ? cdUntil : 0,
        cooldown_until_iso: inCd ? new Date(cdUntil).toISOString() : null,
        cooldown_remaining_sec: inCd ? Math.ceil((cdUntil - now) / 1000) : 0,
        recent_in_window: n, threshold: THRESH, window_min: WINDOW_MIN,
      };
    };

    // ---------- lease / state machine ----------
    const getLease = async () => {
      const raw = await env.KV.get("lease");
      if (!raw) return null;
      const l = JSON.parse(raw);
      return now < l.expires_at ? l : null; // expired => free
    };

    if (req.method === "POST" && url.pathname === "/claim") {
      const b = await req.json().catch(() => ({}));
      const device = b.device || "unknown";
      const task = b.task || "";
      const ttl = Math.min(Math.max(parseInt(b.ttl || "600", 10), 30), 1800); // 30s..30min
      const cur = await getLease();
      if (cur && cur.device !== device) {
        return Response.json({
          granted: false, holder: cur.device, task: cur.task, started_at: cur.started_at,
          expires_at: cur.expires_at, wait_sec: Math.ceil((cur.expires_at - now) / 1000),
        });
      }
      const lease_id = cur && cur.device === device ? cur.lease_id : crypto.randomUUID();
      const lease = {
        device, task, lease_id,
        started_at: cur && cur.device === device ? cur.started_at : now,
        expires_at: now + ttl * 1000,
      };
      await env.KV.put("lease", JSON.stringify(lease), { expirationTtl: ttl + 120 });
      return Response.json({ granted: true, ...lease });
    }
    if (req.method === "POST" && url.pathname === "/heartbeat") {
      const b = await req.json().catch(() => ({}));
      const ttl = Math.min(Math.max(parseInt(b.ttl || "600", 10), 30), 1800);
      const cur = await getLease();
      if (cur && cur.lease_id === b.lease_id) {
        cur.expires_at = now + ttl * 1000;
        await env.KV.put("lease", JSON.stringify(cur), { expirationTtl: ttl + 120 });
        return Response.json({ ok: true, expires_at: cur.expires_at });
      }
      return Response.json({ ok: false, reason: cur ? "lease rotated/held by other" : "no active lease" });
    }
    if (req.method === "POST" && url.pathname === "/release") {
      const b = await req.json().catch(() => ({}));
      const cur = await getLease();
      if (cur && cur.lease_id === b.lease_id) {
        await env.KV.delete("lease");
        return Response.json({ ok: true });
      }
      return Response.json({ ok: false, reason: cur ? "not your lease" : "no active lease" });
    }
    if (req.method === "GET" && url.pathname === "/state") {
      const cur = await getLease();
      return Response.json({
        free: !cur,
        lease: cur ? {
          device: cur.device, task: cur.task,
          started_at: cur.started_at, started_iso: new Date(cur.started_at).toISOString(),
          expires_at: cur.expires_at, age_sec: Math.round((now - cur.started_at) / 1000),
          remaining_sec: Math.ceil((cur.expires_at - now) / 1000),
        } : null,
        cooldown: await cooldownStatus(),
        now,
      });
    }

    // ---------- cooldown endpoints ----------
    if (req.method === "POST" && url.pathname === "/gen") {
      const arr = await getRecent();
      arr.push(now);
      await env.KV.put("gen:recent", JSON.stringify(arr), { expirationTtl: 7200 });
      return Response.json(await cooldownStatus());
    }
    if (req.method === "GET" && url.pathname === "/check") return Response.json(await cooldownStatus());

    // ---------- daily counter ----------
    if (req.method === "POST" && url.pathname === "/report") {
      const b = await req.json().catch(() => null);
      const { device, date, count } = b || {};
      if (!device || !/^\d{4}-\d{2}-\d{2}$/.test(date || "") || typeof count !== "number") {
        return new Response("bad request", { status: 400 });
      }
      await env.KV.put(`c:${date}:${device}`, String(Math.max(0, Math.floor(count))), { expirationTtl: 60 * 60 * 24 * 40 });
      return Response.json({ ok: true, device, date, count });
    }
    if (req.method === "GET" && url.pathname === "/day") {
      const date = url.searchParams.get("date") || new Date(now + 8 * 3600 * 1000).toISOString().slice(0, 10);
      const list = await env.KV.list({ prefix: `c:${date}:` });
      const devices = {}; let total = 0;
      for (const k of list.keys) {
        const v = parseInt((await env.KV.get(k.name)) || "0", 10);
        devices[k.name.slice(`c:${date}:`.length)] = v; total += v;
      }
      return Response.json({ date, total, devices });
    }
    if (req.method === "GET" && url.pathname === "/week") {
      const end = url.searchParams.get("end") || new Date(now + 8 * 3600 * 1000).toISOString().slice(0, 10);
      const endMs = Date.parse(end + "T00:00:00Z");
      const days = {}; let total = 0;
      for (let i = 0; i < 7; i++) {
        const d = new Date(endMs - i * 86400 * 1000).toISOString().slice(0, 10);
        const list = await env.KV.list({ prefix: `c:${d}:` });
        let day = 0;
        for (const k of list.keys) day += parseInt((await env.KV.get(k.name)) || "0", 10);
        if (day > 0) days[d] = day; total += day;
      }
      return Response.json({ end, total, days });
    }

    return new Response("not found", { status: 404 });
  },
};
