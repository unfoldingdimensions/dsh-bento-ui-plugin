# Bento language audit — what the theme implements and what it does not

Measured 2026-11-03 against the shipped plugin, in the isolated `web` profile at
1600x900 (Chrome 156), both themes. Method: probe the rendered DOM, count what each
candidate selector matches, then read computed style **and** pixels. Every number
below was observed this session; nothing is estimated.

The reference corpus is the 12 extracted pages in `research_tmp/reference/`
(`design-system.json` aggregates their tokens, cards, type scales and radii).

---

## 0. Summary

**Nothing is broken.** No P0. Every surface renders, both themes, every width
tested, no clipping and no horizontal scroll.

The theme is missing **language**, not function. It has the tray and the cards; it
does not have a type scale, a spacing ratio, a corner geometry, a focus story, or a
high-contrast mode. Three of its declarations are inert and it does not know that,
because the build gate checks structure and never checks application.

---

## 1. What the reference actually is

Aggregated across all 12 pages:

| Property | Value | Count |
|---|---|---|
| grid | 12 columns, `gap: 16px`, width 1143px | 12 / 12 pages |
| card shadow | `none` | **86 / 86 cards** |
| card radius | `24px` | 83 / 86 (3 are transparent spacers) |
| card padding | `20px` | 68 |
| card padding | `8px` (media/inset cells) | 15 |
| font | `Inter, system-ui, sans-serif` | 12 / 12 pages |
| distinct token sets | **2** across 12 pages | — |

**Radius vocabulary by frequency:** `999px` (191) > `24px` (91) > `12px` (47) >
`18px` (23) > the rest under 10 each. So the reference runs a *three-value* radius
system — tray 24, panel 18, cell 12 — plus a pill.

**Type by frequency:** `13px` (1300) > `16px` (393) > `12px` (332) > `11px` (103).
**Weights:** `400` (1540) > `600` (462) > `700` (304) > `500` (82).

That is a deliberate two-tier type system: 13px body at weight 400, headlines at 600
or 700, and 11px kickers. The weight jump is the hierarchy, not the colour.

**Elevation is zero.** 86 of 86 cards have `box-shadow: none`. Separation comes from
a 1px border and a 1.143 fill step against the page background
(`#FFFFFF` on `#EDF0F4`). This is the Vercel "shadow-as-border" school rather than
Material elevation — see [Vercel's shadow philosophy](https://github.com/fchangjun/awesome-design-md-cn/blob/main/design-md/vercel/DESIGN.md).

---

## 2. What the theme already gets right

Worth recording, because these are the things a future session would otherwise
"fix" into inconsistency.

| Convention | The theme | Verdict |
|---|---|---|
| No decorative shadows | 2 `box-shadow` declarations, **both `inset` 1px edges** | matches 86/86 reference cards |
| One gap, one radius per tier | gutter 12, radius 20, inner 14 — all tokenised | holds |
| No hardcoded colour | one exception: the switch knob shadow (P2.10) | near-holds |
| Closed, fixed set of cells | three columns, host-solved | genuinely closed — the bento property that matters most |
| Anchor dominance | centre card 1296px vs sidebar 256px = **5.1x** | satisfies the ≥1.5x anchor rule comfortably |
| One surface per region | sidebar / centre / right / settings body = one card each | holds; no boxes-inside-boxes |
| Collapsed rail geometry | 56px rail, 4px gutter, **10px radius — verified applied** | correct |
| Reduced motion honoured | 4 `@media (prefers-reduced-motion)` blocks, token → 0ms | holds in the stylesheet, **fails in one component** (P1) |

Measured light/dark layering, which is the whole design in two numbers:

| | card vs canvas | card edge vs card | edge vs canvas |
|---|---|---|---|
| light | **1.164** | 1.254 | 1.077 |
| dark | **1.235** | 1.464 | 1.808 |

The fill step carries the card in both themes and the border is decorative. That is
exactly the reference's model, and it survives the dark inversion.

---

## 3. What is missing — ranked

### P0 — none

### P1 — wrong or risky, fix soon

**P1.1 The plugin's own switch ignores reduced motion.** Under
`prefers-reduced-motion: reduce` the token resolves to `0ms` and every stylesheet
rule honours it (session rows measured `transition: 0s`), but the switch rendered by
`60-settings.js` keeps `transition: background-color 160ms …` and the knob keeps
`translate 160ms` — **both inline styles**, which no media query can reach. The
comment at the top of `15-tokens.js` states the rule this breaks:

> A theme must not be the reason a user's setting is ignored.

Fix: read the media query in the component and pass `0ms`, or move both transitions
out of inline style and onto `[data-dsh-bento-row] [role="switch"]` in the sheet.
One file.

**P1.2 Keyboard users get no row highlight on the Plugins page.** The `page-rows`
feature gave `section ul > li` a hover fill. Measured on that page: the row's own
buttons have `outline: none 3px` and `box-shadow: none`, and the `li` background does
**not** change under `:focus-within` (compared before/after focusing a child:
`rgba(0,0,0,0)` → `rgba(0,0,0,0)`, unchanged). A mouse user sees a tile; a keyboard
user sees nothing.

The theme has **5 `:hover` rules and 0 `:focus-within` rules**. Fix: add
`:focus-within` beside each `:hover` that supplies a fill. One selector per surface.

**P1.3 Three declarations are inert, and the gate cannot see it.** Proven with and
without the stylesheet loaded:

| Declaration | Status | Evidence |
|---|---|---|
| `section h3 { letter-spacing: 0 }` | **no-op** | Chromium computes `letter-spacing: 0` and `0px` as `normal`; removing the rule changes the computed value by nothing (`normal` → `normal`) |
| `--dsh-bento-gap: 8px` | **unused token** | declared in the sheet, referenced 0 times; the only unused one of 11 |
| `[data-row-key^="session:"]:focus-visible` | **unreachable** | rows are `role="treeitem"` with `tabIndex=-1` and 0 focusable descendants; the host never moves focus there, so the selector never matches. The declaration is *correct* — forcing `tabindex=0` turned the border from `transparent` to `rgb(15,17,21)` — but no user will ever see it |

The gate has 13 checks and none of them can catch any of the three above. It proves
CSS is *well-formed*, not that it *applies*.

### P2 — worth fixing when nearby

**P2.1 The spacing ratio is inverted relative to the tray reading.** Bento guidance
puts the outer margin above the inner gap: inner padding ≈ 2x the gutter, and the
section's surrounding margin ≥ 1.5x the gutter
([brainy](https://brainy.ink/paper/bento-grid-design-guide),
[setproduct](https://setproduct.com/blog/bento-grid-layout-design-guide)). Measured
on the shipped theme:

| | measured |
|---|---|
| outer margin (window edge → card) | **12px** |
| gap between cards | **24px** |
| ratio | **0.5** |

Add the gap-to-radius rule (gap between 0.5x and 1x the radius): ours is 24/20 =
**1.2x**, outside the band; the reference is 16/24 = 0.67x, inside it.

So the cards sit *closer to the window edge than to each other*. That is the app
three-pane idiom (VS Code, Slack), not the bento tray idiom — and the theme reproduces
the reference's cards while keeping the app's outer geometry. It reads as "three
panels in a window wearing card styling", not "a tray".

Not fixable by widening the frame's padding: the frame carries an inline
`grid-template-columns` the host solves, and padding on it would compress the columns
and move every drag handle. Recorded, not actioned.

**P2.2 The sidebar card's children are over-rounded against concentric maths, and ours
are the roundest.** Measured inside the sidebar card (outer radius 20px, card left edge
at x=12). For an element inset `d` from its parent's edge, the concentric inner radius
is `max(4, R − d)` — outer = inner + padding, floored at 4
([surfaces.md](https://github.com/boraoztunc/skills/blob/main/make-interfaces-feel-better/surfaces.md)):

| element | radius | inset | concentric answer | over-round by | source |
|---|---|---|---|---|---|
| New Session button | 12px | 14px | 6px | +6 | host |
| nav row (Plugins) | **14px** | 14px | 6px | **+8** | **ours** |
| workspace heading | 12px | 12px | 8px | +4 | host |
| session row | **14px** | 12px | 8px | **+6** | **ours** |

Every child is rounder than the maths asks; ours are the two roundest. The host's
baseline is 12px, we introduced 14px, and the same card now shows both values: the
host's New Session button and workspace headings at 12px, our nav rows and session rows
at 14px, at the same 12–14px inset.

The 24px escape hatch — "if the padding exceeds 24px, treat the layers as independent"
— does not apply: the insets are 12–14px.

**What is right, and was nearly reported wrong.** Two of these numbers were wrong in my
first pass, both caught by re-measuring:

1. I claimed the host's icon buttons were "already the correct 8px", reading a 216px
   inset as if it were the container inset. It is the button's x-offset inside a header
   row, not its inset from the card. Dropped from the claim.
2. The **Settings rows are concentric-correct** and I had not looked: row inset from
   the content card is **0**, the row radius is **14**, the card radius is **14**. Equal
   radii at zero padding is `outer = inner + 0` — exactly right. The negative inline
   margin plus matching padding is what produces it, which means the mechanism that
   looked like a hack is what makes the geometry correct.

**P2.3 The composer's 28px radius inside the 20px card is *not* a defect.** I flagged
this mid-audit and then disproved it: the composer sits 214–331px from the card's
edges, far beyond the 24px threshold where concentric maths is required. Independent
radii are correct at that distance. Recorded because the number looks wrong and is not.

**P2.4 The whole design disappears under Windows High Contrast.** Emulated
`forced-colors: active`: frame and card both compute `rgb(255,255,255)`, so every
surface the theme creates collapses into one plane. Only the card's 1px border
survives (as black). Nothing breaks — it fails safe — but every one of the 6 features
is background-or-border based, so all of them become no-ops at once.

A `@media (forced-colors: active)` block that swaps the fill step for
`CanvasText` borders would keep the composition legible. No rule exists today.

**P2.5 The card radius passes the threshold where circular corners read as bolted on.**
A `border-radius` corner is G1-continuous but not G2 — curvature jumps from 0 to 1/r
at a single point, which the eye reads as a seam. That discontinuity is invisible
below ~16px and obvious above it
([Lisse](https://github.com/JaceThings/Lisse/wiki/Corner-Shapes-Comparison)).
Our card is **20px**, past the line.

`corner-shape: squircle` exists in the runtime: measured
`CSS.supports('corner-shape','squircle') === true` on Chrome 156. It needs a larger
`border-radius` to look right, so it is a token change plus one declaration, guarded
by `@supports` for the Electron build if its Chromium is older
([squircle.js.org](https://squircle.js.org/blog/squircles-in-css)). Not tried.

**P2.6 There are no responsive rules, and that is deliberate.** 4 `@media` blocks
exist; all four are reduced-motion. Zero width breakpoints. Measured at 6 widths
(1600 / 1280 / 1100 / 960 / 820 / 700): no horizontal document scroll, 0 clipped
sidebar rows, composer intact, right column collapsed to 8px at the narrow end. The
host collapses the sidebar to a 56px rail at ≤960 and our rail tokens (4px gutter,
10px radius) take over correctly.

So the theme inherits the host's reflow and adds nothing. Defensible — a fixed gutter
and radius is a token system, and the host is the one that owns breakpoints — but
"reflow, do not shrink" is the one bento rule about width, and we neither implement
it nor state that we don't.

**P2.7 No type scale of our own.** The theme sets no `font-size`, `font-weight` or
effective `letter-spacing` anywhere in the shell (the one attempt, on `h3`, is the
no-op in P1.3). The shell's own inventory on the landing page:

```
14px/400 ×17   12px/400 ×6   10px/400 ×5   13px/500 ×3
13px/400 ×3    16px/400 ×1   14px/500 ×1   26px/500 ×1   12px/500 ×1
```

Nine combinations, nearly all weight 400. The reference runs four dominant sizes and
uses weight 400/600/700 to build hierarchy. Ours has one weight doing all the work,
which is why the surfaces read as evenly weighted regardless of how many cards they
carry.

Not necessarily wrong: the shell is host UI and rewriting its type is out of scope by
decision (D38 rejected restyling what already works). Recorded as the largest
unclaimed part of the language.

**P2.8 Contrast tooling cannot see the cards.** The cards are painted on `::after`,
which is not an ancestor of the content. Any walk-up-the-DOM contrast checker reports
the *canvas* for text that actually sits on the *card*: it reported 4.98 for text
whose real ratio is 5.80. Not a visual defect — a measurement trap for whoever audits
this next. Use the pixel, or hardcode the card tone as the backdrop.

**P2.9 The host's 10px accent badge fails AA, and the canvas makes it slightly worse.**
Measured on the Plugins page: accent `rgb(65,118,230)` at 10px on a 10%-accent pill.
On white **3.75**, on our canvas **3.25** (AA small text needs 4.5). Pre-existing host
styling, not ours, but it is text sitting on a surface we paint, so it is ours to
notice.

**P2.10 One hardcoded colour in the whole plugin.** `60-settings.js` gives the switch
knob `boxShadow: '0 1px 2px rgba(0, 0, 0, 0.3)'`. Every other colour in the plugin is a
`--dsw-*` host alias or a token. The deviation is defensible — a knob needs a shadow and
the host exposes no shadow token — but it is a literal in a codebase whose stated rule
is "no hardcoded colours except artwork", and it is the one thing that will not follow a
registered theme with an unusual palette. Either tokenise it as `--dsh-bento-knob-shadow`
or record the exception in `decision.md`; leaving it as the only silent exception is the
option that ages worst.

---

## 4. What the reference does that would fail here, and why that is correct

The criticism of bento as an application pattern is specific: it needs every cell
filled, it degrades badly under resizing, and it destroys reading order, so it suits
presentations, marketing and dashboards — not a working application
([ux.stackexchange](https://ux.stackexchange.com/questions/149367/bento-grid-trend-interactive-dashboards),
[onedb](https://onedb.net/blog/bento-grids-when-they-work)).

That critique does **not** apply to this plugin, and the reason is worth stating: the
theme did not import bento as a layout. It imported bento as a *surface treatment* on
a layout the host already solved. The columns are the host's, the widths are the
host's, the reflow is the host's; the theme only adds fill, edge, radius and gutter.
None of bento's failure modes are reachable because no cell is ever re-flowed.

The corollary is the real finding of this audit: **the theme has the bento surface and
none of the bento composition** — no anchor, no varied cell sizes, no tray margin. It
looks like the reference without behaving like it, which is the honest reason it reads
as a nice theme rather than a redesign.

---

## 5. The one-line answer

Six working features, zero defects, three inert declarations, no type scale, no
responsive rules, no focus parity, no forced-colors story, and a spacing ratio that is
the inverse of the idiom it borrows — with the single highest-value change being the
reduced-motion bug in our own switch, because it breaks a rule the code states out
loud.

## 6. Corrections made during this audit

Recorded because the audit's value is that its wrong turns are visible, not because
the wrong turns mattered.

| Claim I made | What measurement showed | Where |
|---|---|---|
| the `h3` rule is "broken" | it is a **no-op**: `letter-spacing: 0` computes to `normal`, which is the same as having no rule at all | P1.3 |
| composer radius is a concentric defect | 214–331px from the card edge; independent radii are correct past 24px | P2.3 |
| host icon buttons are "the correct 8px" | 216px is an x-offset inside a header row, not an inset from the card | P2.2 |
| the Settings rows might be over-rounded too | they are **correct**: inset 0, row 14, card 14, so `outer = inner + 0` | P2.2 |
| four inert declarations | **three** declarations plus one unreachable-by-inline-styles media query | §0 |

Five claims, five measurements, four of them wrong on the first pass. All were
corrected before any code depended on them — which is the argument for auditing
without fixing in the same change (D39).

---

## Sources

- [Designing Bento Grids That Actually Work](https://saasframe.io/blog/designing-bento-grids-that-actually-work-a-2026-practical-guide) — three principles, gutter sizes
- [Bento grid layout guide (grid math)](https://setproduct.com/blog/bento-grid-layout-design-guide) — gap/radius band, inner-radius formula, no `grid-auto-flow: dense`
- [Bento Grid Design guide](https://brainy.ink/paper/bento-grid-design-guide) — inner padding ≈ 2x gutter, anchor ≥1.5x, when not to use bento
- [Bento grids: when they work, when they don't](https://onedb.net/blog/bento-grids-when-they-work) — sequence, single-value-prop and equal-weight failures
- [Bento Grid Trend: Interactive Dashboards](https://ux.stackexchange.com/questions/149367/bento-grid-trend-interactive-dashboards) — the strongest case against bento in real UI
- [Concentric border radius](https://github.com/boraoztunc/skills/blob/main/make-interfaces-feel-better/surfaces.md) — outer = inner + padding; >24px means independent
- [When math is right but your eyes disagree](https://medium.com/design-bootcamp/when-math-is-right-but-your-eyes-disagree-6b483c99305e) — optical adjustment factor on nested radii
- [Corner Shapes Comparison](https://github.com/JaceThings/Lisse/wiki/Corner-Shapes-Comparison) — G2 discontinuity obvious past ~16px
- [Squircles in CSS](https://squircle.js.org/blog/squircles-in-css) — `corner-shape: squircle`, Chromium 139+
- [Vercel DESIGN.md](https://github.com/fchangjun/awesome-design-md-cn/blob/main/design-md/vercel/DESIGN.md) — shadow-as-border, zero elevation
