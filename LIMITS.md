# Limits, cooldown, cost & the counter

Read this **before batching**. Two billing paths exist; they have very different limits.

| Path | What uses it | Billed by | Hard $/image? |
|------|--------------|-----------|---------------|
| **Codex subscription** | `scripts/image2.py` (`codex exec image_gen`) | your ChatGPT plan (flat) | no per-image charge |
| **OpenAI API** | any Images API client | per output token | yes — see table below |

## Codex-subscription path (what `image2.py` uses)

- **No per-image dollar cost** — it rides the ChatGPT subscription, not the API. There is **no published images/day cap**; don't quote one.
- **Locally-readable budget** = Codex **5h + 7d rolling token windows**. Check with `python3 scripts/image2.py --usage`.
- Image generation **barely consumes** those windows (15+ images → 5h window still ~1%). Ignore web claims that image turns burn limits 3–5× faster — measured false.
- **The real ceiling is an undocumented anti-abuse cooldown** (empirical, NOT officially published):
  - After a tight burst (**~13 images in ~40 min** observed; budget ~15–20) the server **silently disables** `image_gen`: the model replies "DONE" with **zero** image events, usage% stays ~1%, and it *looks* like a content refusal but isn't — the same prompt succeeds after a wait.
  - **Recovery:** stop and retry in **30–60 min**.
  - **Pacing for big batches:** keep to **≤10–12 images per 30 min**.
  - `image2.py` detects this and reports `silent_refusals` in its JSON summary instead of burning retries.

## Limiter / max parallelism (configurable)

`--concurrency auto|N` on `image2.py`:

- `auto` (default): 1 job → serial · 2–3 → parallel · ≥4 → **cap 4**. Auto-backs-off to **cap 2** at ≥70% of the 5h window, **serial** at ≥90% or when throttled.
- Set `N` to pin a hard max-parallel (e.g. `--concurrency 2` for gentle pacing during a long batch).

**For agents calling this skill:** respect the cooldown, prefer `--concurrency 2`–`3` for batches >6 images, and check `--usage` first.

## Counter / stats

- `python3 scripts/image2.py --usage` prints: 5h & 7d window %, today / last-7d image counts (this device), and cross-device totals.
- Cross-device counter = a Cloudflare Worker + KV. Its config (`{endpoint, token, device}`) lives **outside** the repo at `$CODEX_HOME/image2-counter.json` — **never commit it**. All counter calls are best-effort; offline → silently skipped.

### Shared cooldown gate (same Worker)

The counter Worker also tracks a **shared, cross-device cooldown** so any device/agent can check *before* generating whether the account is about to hit the silent throttle:

- `GET /check` → `{safe, in_cooldown, recent_in_window, threshold, window_min, cooldown_remaining_sec, cooldown_until_iso}` (read-only).
- `POST /gen {device}` → records one generation event into the rolling window; returns the same status.

**Model:** a pure sliding window — at most **`THRESH` (12)** generations per **`WINDOW_MIN` (45)**-minute window, **shared across all devices**. `cooldown_until` is anchored to the event timestamps (= when the oldest in-excess event ages out of the window), so it counts down monotonically rather than jumping. Tune `THRESH`/`WINDOW_MIN` at the top of `worker/worker.js`. Storage is a single KV key (read-your-write → reads are accurate immediately); the only soft spot is a rare lost event under truly simultaneous writes, which just delays the gate by one event.

`image2.py` wires it automatically: `POST /gen` after every saved image, a **warning at batch start if a shared cooldown is active**, and the gate state in `--usage` (`cooldown gate: clear (N/12 in last 45min)`). Other tools/agents can call `GET /check` directly. Worker source + deploy notes: [`worker/`](worker/).

## OpenAI API pricing (the other path) — verified June 2026

Priced **per output token** (image tokens scale with quality × size); per-image $ are OpenAI's own published estimates. **`gpt-image-2` is a real model ID** (image output **$30/1M** tokens, text input $5/1M, image input **$8/1M**, cached image input $1.25/1M).

Per-image, **1024×1024**:

| Model | Low | Medium | High |
|---|---|---|---|
| gpt-image-1 | $0.011 | $0.042 | $0.167 |
| gpt-image-1.5 | $0.009 | $0.034 | $0.133 |
| **gpt-image-2** ⚠️ | $0.006 | $0.053 | $0.211 |
| gpt-image-1-mini | $0.005 | $0.011 | $0.036 |

Non-square (1024×1536 / 1536×1024) is ~1.5× the square price for most models. ⚠️ **gpt-image-2 per-image figures are guide-only / lower-confidence** (the model page defers to the calculator; its token rates ARE confirmed). Reference/img2img images bill as **image-input tokens** — gpt-image-2 always processes inputs at high fidelity, so edits cost more; streaming `partial_images` adds +100 image-output tokens each.

### Rate limits — API only, identical across gpt-image-1 / 1.5 / 2 / mini

| Tier | TPM (tokens/min) | IPM (images/min) |
|---|---|---|
| 1 | 100,000 | 5 |
| 2 | 250,000 | 20 |
| 3 | 800,000 | 50 |
| 4 | 3,000,000 | 150 |
| 5 | 8,000,000 | 250 |

Free tier: image models not supported. RPM not published. **These tier limits do NOT apply to the Codex-subscription path** (this skill) — only the empirical cooldown above does.

Sources: [pricing](https://developers.openai.com/api/docs/pricing) · [gpt-image-2 model](https://developers.openai.com/api/docs/models/gpt-image-2) · [image-gen guide](https://developers.openai.com/api/docs/guides/image-generation) · [rate limits](https://developers.openai.com/api/docs/guides/rate-limits)
