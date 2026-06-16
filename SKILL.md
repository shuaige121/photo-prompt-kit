---
name: image2-prompt
description: >-
  Write realistic, anti-uncanny prompts for gpt-image-2 (OpenAI "Image 2") photography across 12 genres:
  Food & Beverage, Portrait & People, Product/Commercial/E-Commerce, Landscape & Nature,
  Architecture/Interior/Real-Estate, Street/Documentary, Still Life, Fashion & Beauty Editorial,
  Wildlife & Animals, Event & Wedding, Automotive, and Macro/Close-Up. Use when the user wants a
  photo-real image prompt or shot brief — food/menu/delivery shots, headshots/candid/group portraits,
  packshots/Amazon/lifestyle product, vistas/seascapes/forests, room/facade/twilight real-estate,
  reportage/neon/night street, tabletop/chiaroscuro/flat-lay still life, studio/lookbook/beauty fashion,
  telephoto/bird/pet/insect wildlife, ceremony/reception/detail wedding, hero/rolling/detail car shots,
  or extreme crumb/dewdrop/gem/texture macro — and needs it to read as a real photograph, not a render.
  Each genre ships paste-ready shot-brief snippets, named lens + aperture + light + angle defaults,
  a banned-words list, and img2img/reference notes. FIRST pick a mode — Precise Control (adherence) vs
  Evocative/意境 (resonance) — in recipes/MODES.md, then drill into recipes/<genre>.md for the full recipe.
  Also bundles a generator (scripts/image2.py, with a --concurrency limiter + --usage counter), a macOS
  Apple-Vision cutout to transparent PNG (scripts/cutout.swift), rate-limit/cooldown/pricing docs (LIMITS.md),
  and an output-organization convention (OUTPUTS.md) — so a calling agent knows the limits, can set max
  parallelism, can auto-cut subjects to transparent PNG, and knows how to file the results.
---

# image2-prompt

Paste-ready, anti-uncanny prompts for **gpt-image-2** photography. Pick a genre below, grab the
matching sub-category snippet, fill the brackets, ship. Snippets are shot briefs — specify, don't praise.

## The one rule (applies to every genre)

**Realism comes from specifics + believable imperfection, not adjectives.** Name ONE lens + aperture,
ONE light direction + quality, ONE camera angle, and anchor 2+ real textures or flaws (pores, steam,
condensation, scuffs, stray hairs, wrinkles, dust). Say "real photograph" so the model targets a photo.
**Never use** `8k / 4k / masterpiece / hyper-detailed / studio lighting / cinematic / vibrant / stunning /
flawless / octane / unreal engine / award-winning` — these are the AI/CGI tells. Every genre file carries
its own full banned-words list; honor it.

## Step 0 — pick a mode (the calling LLM chooses; no default)

Before the genre, decide **what you're optimizing**. Full guide: **[`recipes/MODES.md`](recipes/MODES.md)**.

- **🎯 Precise Control (精确控制)** — optimize *adherence* (image must obey the prompt). For product, identity/likeness, brand consistency, exact composition, matching a reference. Control-heavy; pass `--ref`.
- **🌫️ Evocative (意境圆满)** — optimize *resonance* (image must make people feel). For editorial, mood, story, hero/atmosphere shots. Intent-heavy; keep the implied scene simple & renderable.

These are the field's two fundamental axes (alignment vs human-preference) — they trade off, don't max both. Pick by the subject's **story-capacity**: can it carry a feeling (people/scenes/evocative food → Evocative) or not (lone product/icon → Precise Control)?

| word budget | 🎯 Precise Control | 🌫️ Evocative |
|---|---|---|
| Intent (mood/message/narrative) | ~15% | **~50%** |
| Subject + specifics | ~30% | ~25% |
| Control (lens/light/angle) | **~35%** | ~15% |
| Constraints | ~20% | ~10% |

*(ratios are lean defaults — an n=3 study found the effect modest; the big levers are no-render-spam + length sweet-spot + intent-for-scenes. See recipes/MODES.md.)* One subject < ~110 words either way. Then pick a genre below and compose at your mode's ratio.

## Genres (interface)

Each genre has a `when_to_use`, a base recipe, named camera/light defaults, sub-categories with paste-ready
snippets, a banned-words list, and img2img/reference notes. Full detail: `recipes/<genre>.md`.

### Food & Beverage — `recipes/food_beverage.md`
**When:** the subject is edible or drinkable and the goal is appetizing realism.
Sub-categories: Menu/delivery-app catalog shot · Editorial/magazine dark-and-moody · Fine-dining hero ·
Flat-lay/overhead spread · Beverage/cocktail · Dessert · Street food/documentary.

### Portrait & People — `recipes/portrait_people.md`
**When:** the subject is one or more humans and likeness/skin/expression/pose is the point.
Sub-categories: Candid lifestyle · Studio headshot · Environmental portrait · Group portrait ·
Beauty/macro closeup · Anti-uncanny skin booster (append to any of the above when a face comes back plastic).

### Product / Commercial / E-Commerce — `recipes/product_commercial_ecommerce.md`
**When:** the subject IS a physical product to sell or advertise.
Sub-categories: White-background pack-shot (Amazon/catalog) · Lifestyle in-scene hero · Macro detail/texture ·
Flat-lay (overhead) · Jewelry/reflective metal & glass · Cosmetics/skincare · Floating/levitation product.

### Landscape & Nature — `recipes/landscape_nature.md`
**When:** an outdoor scene with no central human subject — vistas, water, skies, minimalist nature.
Sub-categories: Golden-hour mountain vista · Seascape/coastal · Long-exposure water (silk) ·
Forest/woodland interior · Minimalist/negative space · Desert/arid dunes · Blue hour/night sky.

### Architecture / Interior / Real-Estate — `recipes/architecture-interior-realestate.md`
**When:** the subject is a building, a room, or a property listing.
Sub-categories: Interior room (real-estate/editorial) · Building exterior (facade, golden hour) ·
Twilight/dusk exterior (blue hour) · Architectural detail/texture · Wide-angle small space (bath/kitchen/hall) ·
Open-plan/wide interior establishing shot.

### Street / Documentary — `recipes/street_documentary.md`
**When:** candid, unposed, real-world human moments — reportage, night neon, markets, motion.
Sub-categories: Daytime candid street (35mm classic) · Black-and-white reportage (Tri-X/Magnum) ·
Night street/neon (Cinestill 800T) · Motion/panning blur · Hard-flash close-up (Gilden style) ·
Environmental/market documentary · Crowd/protest from the hip.

### Still Life — `recipes/still_life.md`
**When:** an arranged set of inanimate objects on a surface; composed, painterly object look.
Sub-categories: Classic tabletop grouping · Dark/moody chiaroscuro · Overhead flat-lay ·
Floral bouquet (Dutch Golden Age) · Vanitas/symbolic · Bright airy/Scandinavian · Macro detail/fragment.

### Fashion & Beauty Editorial — `recipes/fashion-beauty-editorial.md`
**When:** a styled human modeling clothing, makeup, hair, or accessories.
Sub-categories: Studio fashion editorial (seamless/colorama) · On-location editorial (street/natural light) ·
Beauty close-up (skin/makeup/hair) · Lookbook/e-commerce apparel (on-model) ·
Ghost-mannequin/flat-lay product apparel · High-fashion dramatic editorial (gels/hard light).

### Wildlife & Animals — `recipes/wildlife-animals.md`
**When:** a live animal — wild mammal/bird at distance, pet, bird in flight, or insect macro.
Sub-categories: Telephoto big-game/mammal portrait · Environmental/habitat animalscape · Bird in flight ·
Bird on a perch/songbird portrait · Pet portrait (dog/cat) · Macro insect/small creature ·
Underwater/wet-environment · Snow/cold-weather wildlife.

### Event & Wedding — `recipes/event-wedding.md`
**When:** a wedding or live event — candids, reception, posed portraits, styled detail flat-lays.
Sub-categories: Ceremony candid (vows/first kiss/reactions) · Aisle/processional wide ·
Reception/dance floor (shutter drag + flash) · Golden-hour couple portrait ·
Detail flat-lay (rings/invitation/florals) · Getting-ready/prep candid · Speeches & toasts (warm tungsten).

### Automotive — `recipes/automotive.md`
**When:** the subject is a car, motorcycle, or vehicle.
Sub-categories: Studio hero (cyc wall/seamless) · Rolling/motion shot · Detail/macro close-up ·
Lifestyle on-location · Off-road/dirty action · Night/city lights.

### Macro / Close-Up — `recipes/macro.md`
**When:** the subject fills the frame at extreme range and the point IS the micro-texture.
Sub-categories: Food macro (crumb/steam/pour) · Food macro (liquid & droplet) · Product macro (jewelry/gemstone) ·
Product macro (cosmetics/liquid texture) · Product macro (material/texture detail) · Nature macro (insect/dewdrop) ·
Nature macro (flower/botanical) · Abstract texture macro (pattern fill).

## How to use

1. Match the request to a genre above (use `when_to_use` to disambiguate — e.g. a car detail shot goes to
   Automotive, a generic crumb close-up goes to Macro, a plated dish goes to Food).
2. Open `recipes/<genre>.md`, pick the sub-category whose `when` fits, copy its `snippet`.
3. Fill the brackets with concrete nouns + textures. Keep ONE lens, ONE light, ONE angle.
4. Check the genre's banned-words list before sending.
5. For likeness/label/product/identity fidelity, read the genre's img2img notes and pass a reference image —
   reference images are the single biggest realism lever for Product, Street, Macro, Wildlife, Architecture,
   and any identity-critical Portrait/Fashion/Wedding shot.


## Generate

This kit is the prompt half. To render, pair it with a gpt-image-2 runner:

- `scripts/image2.py` — drives gpt-image-2 headlessly via Codex; text2img + img2img (`--ref`), parallel, usage reporting.
  ```bash
  python3 scripts/image2.py "<paste a recipe snippet, brackets filled>" --quality high
  python3 scripts/image2.py "<snippet>" --ref subject.jpg --ref-mode subject   # img2img
  ```
- Or any OpenAI Images API client (see `RESOURCES.md`).

Workflow: pick genre -> open `recipes/<genre>.md` -> copy the sub-category snippet -> fill `[brackets]` -> (optional) add a reference image with `--ref` + that genre's img2img clause -> generate -> if it looks AI, check you didn't use a banned word.

## Tooling, limits & outputs

- **Generate:** `scripts/image2.py` (gpt-image-2 via Codex; text2img + img2img `--ref`). Pin max parallelism with `--concurrency N`.
- **Limits & cost — read [`LIMITS.md`](LIMITS.md) BEFORE batching:** the undocumented Codex **anti-abuse cooldown** (~13 images / 40 min burst → 30–60 min silent lockout; pace **≤10–12 images / 30 min**), the `--concurrency` limiter (auto-backs-off on the 5h window), the `--usage` counter (5h/7d windows + per-device & cross-device totals), the OpenAI **API pricing** table (gpt-image-2 ≈ $0.006/$0.05/$0.21 low/med/high at 1024²) and **IPM/TPM tier limits**. The Codex-subscription path has no per-image charge and the API tier limits don't apply.
- **Cutout → transparent PNG:** `scripts/cutout.swift` (macOS 14+, Apple Vision subject lift — same as press-and-hold "copy subject"). `swift scripts/cutout.swift in.png out.png`. Pair generate→cutout for reusable composite-ready assets (Linux: use `rembg`).
- **Organize outputs:** [`OUTPUTS.md`](OUTPUTS.md) — `outputs/<genre>/<project>/` layout mirroring the taxonomy, naming convention, a `manifest.jsonl` provenance line per image, and the generate→cutout→record automation loop.
