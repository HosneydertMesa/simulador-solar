---
name: reviewing-solara-ux
description: Use when reviewing Solara UI, layout clutter, simple vs technical modes, charts, Spanish copy for non-experts, or before calling a solar-simulator screen done.
---

# Reviewing Solara UX

## Overview

Review Solara as a neighbor who does not know PV jargon, then as an installer. Core principle: the simple view must answer “¿me alcanza?” in one glance; the technical view may show LCOE.

## When to Use

- After changing Simulator, SimpleView, TechnicalView, charts, or copy
- User mentions saturado, amontonado, no se entiende, UI, UX
- Before claiming a visual change is done

## Output contract

Write these sections in this order:

1. **Verdict** — one of: ship / fix-then-ship / blocked
2. **Neighbor path** — can a non-expert add a fridge or AC and see what changed without opening Técnico?
3. **Clutter** — what competes on first screen; what should collapse
4. **Charts** — is the day chart interactive and labeled in Spanish (sol vs casa)?
5. **Jargon leaks** — PR, LCOE, clipping, azimut visible in Para mí? Flag each.
6. **Mode switch** — Para mí ↔ Técnico keeps the same system; labels stay Spanish
7. **Fixes** — at most 5, ordered by user harm

## Rules

- Judge the running UI structure and copy, not engine physics.
- Simple mode must not dump 15 metrics. Three KPIs plus a headline is the cap on the hero.
- Do not ask to remove the technical view.
- If you did not inspect SimpleView and the mode toggle, verdict is blocked.
