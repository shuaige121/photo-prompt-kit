# img2-counter Worker — shared counter + cooldown gate

A tiny Cloudflare Worker (+ KV) that tracks image-generation counts across devices **and** a shared cooldown window, so any device/agent can check *before* generating whether the account is about to hit the gpt-image-2 / Codex silent throttle.

## Endpoints (all require `Authorization: Bearer <AUTH_TOKEN>`)

- `GET  /check` — read-only gate: `{safe, in_cooldown, recent_in_window, threshold, window_min, cooldown_remaining_sec, cooldown_until_iso}`
- `POST /gen {device}` — record one generation event; returns the gate status
- `POST /report {device,date,count}` — absolute daily count per device (idempotent, race-free)
- `GET  /day?date=YYYY-MM-DD` — sum across devices
- `GET  /week?end=YYYY-MM-DD` — last 7 days

**Coordination / lease (state machine — serialize generation across devices):**
- `POST /claim {device, task, ttl?}` — acquire the single generation lease → `{granted:true, lease_id, expires_at}` or `{granted:false, holder, task, wait_sec}`
- `POST /heartbeat {lease_id, ttl?}` — extend your lease during a long batch
- `POST /release {lease_id}` — give it back
- `GET  /state` — `{free, lease:{device, task, started_iso, age_sec, remaining_sec}, cooldown}` → **who is generating right now, since when, doing what, + the cooldown**

## Why the lease

The OAuth refresh token is **rotating/single-use**: if two devices (or two concurrent `codex exec` processes) refresh it at the same time, one wins and the other's token is invalidated (`refresh_token_invalidated`) — which is exactly how a heavy multi-device run can kill auth. The lease makes generation **mutually exclusive across devices**: claim before a batch, others wait, release after. `ttl` (default 600s, 30–1800) auto-expires a crashed holder. `scripts/paced_run.py` uses it.

## Cooldown model

A pure sliding window: at most **`THRESH` (12)** generations per **`WINDOW_MIN` (45)**-minute window, **shared across all devices**. `cooldown_until` is anchored to the event timestamps so it counts down monotonically. Mirrors the empirical gpt-image-2/Codex anti-abuse throttle so you stop *before* the server silently refuses. Tune `THRESH`/`WINDOW_MIN` at the top of `worker.js`.

## Deploy your own

```bash
wrangler kv namespace create IMG2_COUNTER        # 1. make a KV namespace, copy the id
cp wrangler.toml.example wrangler.toml           # 2. paste the id into kv_namespaces.id
wrangler secret put AUTH_TOKEN                    # 3. set the shared bearer token
wrangler deploy                                   # 4. ship
```

Then on each device write `$CODEX_HOME/image2-counter.json` (never commit it):

```json
{"endpoint":"https://<your-worker>.workers.dev","token":"<AUTH_TOKEN>","device":"mac"}
```

`scripts/image2.py` then auto-records `/gen` after each image, warns at batch start if a shared cooldown is active, and shows the gate in `--usage`. The free Workers tier is plenty — counter/cooldown traffic is tiny.
