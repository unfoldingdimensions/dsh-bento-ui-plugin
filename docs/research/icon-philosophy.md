# Icon philosophy for bento UI

Written for `dsh-bento-theme`, but the reasoning is general: what icons do in a bento
composition, and what this theme may and may not do about them.

Every number below was measured in the running app or the reference corpus on
2026-11-03. Nothing here is asserted from taste.

---

## 1. The single sentence

**Icons in a bento composition are punctuation, not content.**

A bento cell is a unit of meaning built from a heading, a body and a surface. The icon
does not add a fourth idea — it marks *which* idea this cell holds, so the eye can locate
a cell before reading it. That is why the reference corpus is overwhelmingly
text-and-data, and why icon-heavy bento grids (the "icon soup" pattern) read as
placeholder content: when every cell leads with a glyph, the glyphs stop distinguishing
anything and become texture.

The corollary is a budget: **if two cells would carry the same glyph, neither icon is
doing work.** That is not a style rule; it is the definition of a discriminator.

---

## 2. What the reference corpus actually does

The extracted bento pages were counted for `<svg>` elements (14 files, which is what the
corpus actually contains — earlier notes said 12):

| Pages | SVGs | Note |
|---|---|---|
| 7 of 14 | **0** | no icons at all |
| 6 of 14 | 1–2 | a logo, a chevron, one mark |
| 1 of 14 | 13 | a different product embedded, 18px / 24-viewBox / 2px |
| **Total** | **21** | ≈1.5 per page across 470 KB pages |

The pages carrying real bento cards — KPI tiles, charts, stat cells, tables — are the
ones with **zero** icons. The one page with a full icon set is not a bento page; it is a
different surface with a different system (18px box, 24px viewBox, 2px stroke).

**So: the bento look is largely an icon-free look.** Density, weight and alignment carry
it. This is the most useful finding here because it inverts the assumption behind most
"bento icon" requests: people picture a grid of glyph tiles, and the reference picture is
a grid of numbers.

---

## 3. What the host's icon system is

The theme inherits every icon it does not draw, so the host system is the floor. Measured
across 49 icons (home screen plus Settings open), both themes:

| Property | Value | Consistency |
|---|---|---|
| **size** | 16×16 dominant (24), 14×14 next (14), 15 / 18 / 12 rare | 2 main sizes |
| **viewBox** | `0 0 16 16` for all but two | one grid |
| **stroke** | **1px** dominant, **1.3px** second — two weights | **two weights** |
| **linecap** | `butt` (48), `round` (2) | one, near-universal |
| **linejoin** | `miter` (46), `round` (3) | one, near-universal |
| **colour** | `currentColor` | **65 of 65** |
| **style** | outline, with 1–3 filled accents per glyph | outline-first |

Two things to note, because both are easy to get wrong from memory:

**It is not the Material model.** The dominant public guidance is a 24px grid with a 2px
stroke ([design-system skill](https://github.com/jpoindexter/design-and-ai-skills/blob/main/design-system-skills/iconography-and-imagery/SKILL.md),
[Adobe](https://adobe.design/ideas/how-to-design-effective-icons-part-2)). This host runs a
**16px grid at 1px** — half the stroke at two-thirds the box. Adopting 24/2 here would
make every new icon 2× too heavy next to its neighbours.

**The two stroke weights split by region, not randomly:**

| Region | 1px | 1.3px | icons |
|---|---|---|---|
| sidebar | 11 | 2 | 16 |
| centre | 8 | 1 | 12 |
| Settings dialog | 8 | **9** | 17 |
| elsewhere | 3 | 0 | 4 |

The Settings dialog is the one place 1.3px is common (9 of its 17 icons against 1 in
the centre column). **Why** is not measured — a shorter viewing distance inside a modal is
the plausible reason, but it is an inference, not a finding. What *is* measured is the
split, so the rule it supports is narrow and safe: 1px is the default, and 1.3px is
permitted only inside the Settings dialog. Both screens together: 30 icons at 1px, 12 at
1.3px.

---

## 4. The rules this implies for a theme plugin

### 4.1 Draw as few icons as possible

The reference is icon-sparse and the host already draws every chrome icon. A theme's icon
budget is therefore **near zero**: a theme is a surface treatment, and a surface
treatment that adds glyphs is adding content it does not own.

The only icons a theme legitimately owns are ones that identify *the theme itself*.

### 4.2 Never restyle a host icon

Icons are `currentColor` throughout, which means they already follow text colour, which
means they already follow the theme's surfaces. Restyling them would mean overriding
`color` on host glyphs — the same class of mistake as restyling host typography (D35).
The theme's job is to give icons the right *background*, not the right *ink*.

### 4.3 When you must draw one, match the measured system

Not the published one. Concretely, for this host:

```
viewBox     0 0 16 16          (not 24)
render      16 px              (14 acceptable in dense rows)
stroke      1 px               (1.3 inside the Settings dialog only)
caps/joins  butt / miter
colour      currentColor       (never a literal — gate 15)
style       outline            filled only as an accent inside the outline
size        ~1.0–1.15× adjacent text size (measured median 1.14, drift 0px)
```

That last line is the alignment rule and it is measured, not guessed: across 20
icon/text pairs the icon width ran **0.92× to 1.31× the adjacent font size, median
1.14×**, with a median vertical offset of **0** px. So an icon sits at roughly `1.1em`
and is centred on the text box, not the cap height.

One honest caveat: the *maximum* vertical offset in that sample was **53px**, which is
not a misalignment — it is the pairing heuristic latching onto a text node in a different
row (a label above a control whose icon sits below it). The median of 0 over 20 pairs is
the usable number; the maximum is the heuristic failing, and is recorded here rather than
quietly dropped.

### 4.4 One glyph per idea, and the "budget" test

Before adding an icon, answer: *what other icon in this interface could this be confused
with?* If the answer is "anything", the icon is decoration. If the answer is "nothing",
it is a discriminator and it earns its place.

The reference's own contrast is instructive: its best cells have no icon and its worst
have one that repeats.

---

## 5. What this theme currently does, and why it fails

Three measurements, three problems.

### 5.1 The product icon does not match the system

`icon.svg` is shipped and used as the package icon:

| Property | theme's icon | host system |
|---|---|---|
| viewBox | `0 0 32 32` | `0 0 16 16` |
| fill | **`#4C7DF0` literal** | `currentColor` |
| style | **solid, 4 shapes, 3 opacities** | outline |

This is a *package* icon (an app-icon slot, where a 32px filled mark is correct and
`currentColor` is not) — so it is not a defect **in that slot**. It becomes one the moment
it is drawn *inside the UI*, because then it is a 32px filled blue mark among 16px
outline `currentColor` glyphs.

**Rule:** a package icon and a UI icon are different artefacts. Do not reuse one as the
other. If the theme ever needs an in-UI mark, it is a separate 16×16 outline asset, and
the current file must not be it.

Its blue also fails the non-text contrast floor on our own canvas:

| Surface | `#4C7DF0` contrast | Requirement |
|---|---|---|
| light canvas `#ebeef2` | **3.28** | 3.0 for non-text — passes, barely |
| dark canvas `#1b1b1c` | 4.51 | passes |
| white card | 3.82 | passes |

3.28 clears 3:1 for a *graphical object* but nothing more, and it is a fixed colour — it
will not follow a registered theme.

### 5.2 The Settings tab shows a gear, shared with two other tabs

Measured on the six Settings tabs: **4 distinct glyphs for 6 tabs**, with
`General + Bento layout + Remote Access` drawing the **identical** gear. Confirmed by
byte-identical path data and by pixel crops at 4×.

This is the host's fallback: the nav glyph comes from a hard-coded map keyed by section
id, and an id the map does not know gets the gear. It is host behaviour and the theme
cannot currently override it.

**But it is still the theme's problem to state.** The tab that exists to configure this
theme is visually indistinguishable from the tab that configures everything else, which
is the exact failure mode §4.4 forbids. It should be recorded as a known limitation, not
silently accepted as fine — and if the host ever exposes a glyph hook, this is the one
icon worth drawing.

### 5.3 The nav rows are icon-led, correctly

Every sidebar row — nav destinations, sessions, workspaces — leads with a host glyph at
16px, `currentColor`, 1px. This is the one place the interface *is* icon-led, and it is
right: those glyphs are genuine discriminators (a plug for plugins, a folder for a
workspace, a session mark for a session). The theme adds no icons there and must not.

---

## 6. The rules as a checklist

Before adding an icon to this theme:

1. **Does the host already draw it?** If yes, do not draw a second one. (Always yes for
   chrome.)
2. **Is it a discriminator or decoration?** If another icon in the interface could be
   confused with it, it is decoration.
3. **Is it a package icon or a UI icon?** They are different artefacts. Never reuse.
4. **Does it match 16×16 / 1px / butt / miter / outline / `currentColor`?** Not 24/2,
   not filled, not a literal colour.
5. **Is it ~1.1× the adjacent text size and vertically centred on the text box?**
6. **Does its contrast clear 3:1 on every surface it can land on, in both themes?** If it
   is `currentColor` this is automatic, which is the argument for `currentColor`.
7. **Would removing it lose information?** If not, remove it.

---

## 7. What to change, ranked

**P1 — the Settings tab glyph is ambiguous.** Not fixable in CSS (host-owned map), so
the fix is a host feature request or accepting the limitation. Recording it is the
action available now; it is the only *visible* icon problem in the theme.

**P2 — document the two-artefact rule.** `icon.svg` is a package icon and must never be
rendered inside the UI. One line in the README prevents a future session from "reusing"
it as a tab mark, which is the obvious and wrong move.

**P2 — the reference is icon-sparse; keep it that way.** No feature should gain icons.
If a future surface needs one, §6 is the gate.

**No action — the host's icons.** Already correct: `currentColor`, one grid, one dominant
stroke, butt/miter. The theme inherits a better system than it could draw, and the right
move is to stay out of its way.

---

## Sources

- [A complete guide to iconography](https://designsystems.com/iconography-guide) — one grid, one stroke, one style; optical padding equal to stroke
- [design-and-ai-skills: iconography](https://github.com/jpoindexter/design-and-ai-skills/blob/main/design-system-skills/iconography-and-imagery/SKILL.md) — 24/2 as the *public default*, keylines, optical alignment, `currentColor`
- [Adobe: designing effective icons](https://adobe.design/ideas/how-to-design-effective-icons-part-2) — stroke weight follows size; test in context
- [Website feature-section patterns (bento)](https://saglitz.com/design/web-feature-sections) — icon-led index vs bento; "icon soup" named as a failure
- [Practical guide to icon design](https://uxplanet.org/practical-guide-to-icon-design-794baf5624c8) — 8px grid, live area, consistent stroke
