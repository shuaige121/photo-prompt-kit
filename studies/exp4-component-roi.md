# exp4 — per-component marginal return (gpt-image-2)

**Question:** when you add ONE more descriptive sentence to a bare prompt, which *kind* of sentence buys the most quality?

**Design.** 2 subjects (an elderly fisherman = story-capable; a glass perfume bottle = isolated object) × 6 variants (bare `base` + 5 single-component additions: `subj` concrete specifics, `light` technical lighting spec, `lens` lens/DoF, `intent` emotional intent, `texture` real-skin/grain) × 2 reps = **24 images**, all generated on one clean Codex token, paced ≤12/45min.

**Scoring.** Blind: each subject×rep group of 6 was shuffled to A–F; 3 raters per group (12 rater-sheets) read all 6 and scored each on realism / depth / light / emotion / technical / overall (1–10). Each component is compared to the **bare base in the same group, by the same rater**, so subject, rep, and rater-scale all cancel — the delta is the pure component effect.

## Result — mean overall lift over base

| added sentence | overall | realism | depth | light | emotion | technical |
|---|---|---|---|---|---|---|
| concrete subject specifics | **+1.32** | +1.28 | +0.83 | +0.38 | +1.27 | +1.18 |
| emotional intent | **+0.87** | +0.11 | +1.07 | +0.96 | **+1.77** | +0.30 |
| lens / depth-of-field | +0.33 | +0.23 | +0.20 | +0.01 | +0.35 | +0.32 |
| texture / "real skin, grain" | +0.22 | +0.64 | −0.42 | −0.71 | +0.27 | +0.22 |
| bare lighting spec | −0.12 | −0.23 | −0.49 | −0.08 | +0.12 | −0.08 |

## Takeaways
1. **Subject specifics = universal highest-ROI spend** — lifts all six axes. Always the first sentence.
2. **Intent buys resonance, not realism** — emotion +1.77 (and depth, light) but realism +0.11. Empirical proof of the Precise-Control vs Evocative split: intent won't fix an unconvincing render.
3. **Light is best delivered through intent, not a lighting spec** — a standalone technical light line is net-negative (−0.12); intent raises the light axis +0.96. Mood implies better light than f-stops do.
4. **Texture is a trade** — +realism, −depth, −light. Use only when realism is the bottleneck.

**Word-spend priority:** subject specifics → intent → lens → texture (if needed) → skip standalone lighting spec.

*Caveats:* n=12 sheets, 2 subjects, single-component additions only (no interaction terms); light's negative rests on a small sample but the direction is corroborated by intent's large light gain. Complements the n=3 *ratio* study (see `recipes/MODES.md` Calibration I).
