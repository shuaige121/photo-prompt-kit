#!/usr/bin/env python3
# Aggregate exp4 blind scores -> per-component marginal return over base.
# usage: aggregate.py <workflow_output.json>
import json, sys
from collections import defaultdict

KEY = json.load(open("/tmp/exp4/blind/key.json"))
RAW = json.load(open(sys.argv[1]))

# dig to the list of rater sheets regardless of wrapping
def find_results(o):
    if isinstance(o, list):
        if o and isinstance(o[0], dict) and "scores" in o[0]:
            return o
    if isinstance(o, dict):
        for k in ("result", "results", "raters"):
            if k in o:
                r = find_results(o[k])
                if r: return r
        for v in o.values():
            r = find_results(v)
            if r: return r
    return None

res = find_results(RAW)
assert res, "could not locate rater sheets in JSON"

DIMS = ["realism", "depth", "light", "emotion", "technical", "overall"]
COMPS = ["base", "subj", "light", "lens", "intent", "texture"]
LABEL = {"base": "base(裸)", "subj": "主体细节", "light": "光线", "lens": "镜头/景深",
         "intent": "情绪意图", "texture": "质感/真实"}

raw = defaultdict(lambda: defaultdict(list))     # comp -> dim -> [vals]
deltas = defaultdict(lambda: defaultdict(list))  # comp -> dim -> [val-base]
n_sheets = 0

for sheet in res:
    g = sheet["group"]
    byletter = {str(s["id"]).strip().upper()[:1]: s for s in sheet["scores"]}
    comp2letter = {comp: L for kk, comp in KEY.items()
                   for grp, L in [kk.split("/")] if grp == g}
    base_s = byletter.get(comp2letter.get("base"))
    n_sheets += 1
    for comp in COMPS:
        s = byletter.get(comp2letter.get(comp))
        if not s: continue
        for d in DIMS:
            if d in s and isinstance(s[d], (int, float)):
                raw[comp][d].append(s[d])
                if base_s and comp != "base" and d in base_s:
                    deltas[comp][d].append(s[d] - base_s[d])

mean = lambda xs: sum(xs) / len(xs) if xs else float("nan")

print(f"rater sheets aggregated: {n_sheets}\n")
print("=== ABSOLUTE mean scores ===")
print(f"{'component':12}" + "".join(f"{d[:5]:>7}" for d in DIMS))
for comp in COMPS:
    print(f"{LABEL[comp]:12}" + "".join(f"{mean(raw[comp][d]):7.2f}" for d in DIMS))

print("\n=== MARGINAL delta vs base (same group+rater) ===")
print(f"{'component':12}" + "".join(f"{d[:5]:>7}" for d in DIMS))
for comp in COMPS:
    if comp == "base": continue
    print(f"{LABEL[comp]:12}" + "".join(f"{mean(deltas[comp][d]):+7.2f}" for d in DIMS))

print("\n=== ranked by OVERALL marginal return ===")
rank = sorted([c for c in COMPS if c != "base"], key=lambda c: -mean(deltas[c]["overall"]))
for i, c in enumerate(rank, 1):
    best = max([d for d in DIMS if d != "overall"], key=lambda d: mean(deltas[c][d]))
    print(f"{i}. {LABEL[c]:12} overall {mean(deltas[c]['overall']):+.2f}   "
          f"主要拉高: {best} {mean(deltas[c][best]):+.2f}")
