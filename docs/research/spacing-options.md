# Bento spacing options — gap 16 / window edge 16 / card inset 20

Measured on the live rig (`http://127.0.0.1:51991`, throwaway DSH 0.2.2-rc.1 profile) with
`playwright-core` + `C:\Program Files\Google\Chrome\Application\chrome.exe` (headless, deviceScaleFactor 1).
Every number below comes from `page.evaluate` reading a live element: part rects, computed
`padding`/`inset`, the `::after` pseudo that paints each card, `scrollWidth` vs `innerWidth`.
No theme source was touched — only `page.addStyleTag` sheets, removed between cases. Scripts: `research_tmp/B-*.js`.

**Rule read back after every injection.** Before each measurement the injected sheet was verified to have
won: computed `--dsh-bento-gutter`, `--dsh-bento-cell-inset`, frame `padding`, all three columns' `padding`,
and all three `::after` insets were printed. Every table row below carries the values that were actually
applied, so "the rule lost on specificity" is excluded rather than argued about.

**Selector control.** `[data-dsh-bento-part]` → 4 nodes (frame, sidebar, center, rightbar).
`[data-row-key^="session:"]` → 6 nodes, `[data-row-key^="workspace:"]` → 6. Zero-hit candidates discarded:
`[data-dsh-session-id]` 0, `[data-session-id]` 0, `[role="option"]` 0, `li` 0.
Settings: `button[aria-label*="Account menu" i]` → 1, `[role="menuitem"]` text starting "Settings" → 1,
dialog `[data-shortcut-modal="settings"][role="dialog"]` → 800×800 @ (400,100) at 1600, 800×752 @ (240,24) at 1280.

---

## 0. The theme's actual arithmetic (and the frame's real padding)

`html[data-dsh-bento]` inline stylesheet, 105 bento rules. Two tokens only:

```css
--dsh-bento-gutter: 12px;      /* column padding, ::after inset, AND settings margins  */
--dsh-bento-cell-inset: 16px;  /* nested panels + settings rows                      */
[data-dsh-bento-part="sidebar"|"center"|"rightbar"] { padding: var(--dsh-bento-gutter); }
…::after { content:""; position:absolute; inset: var(--dsh-bento-gutter); … }   /* the painted card */
```

**Computed frame padding before any injection: `0px` at 1600×1000, 1280×800, 1100×800 and 826×1000.**
`box-sizing: border-box`, `display: grid`, `overflow: hidden`, grid
`280px minmax(0,1fr) minmax(0,0px)`. So the lead's arithmetic holds on this build:
**edge = P + C, gap = 2C**, with P = 0 today. No pre-existing frame padding to account for.

Second measured fact the model hides: the column padding is an *offset*, not an inset. In both baseline and
final layouts the widest children sit flush with the painted card (`leftInset 0`): sidebar
`hHd-Xa_root` 0/0 in a 256 px card, center `pI_x6G_mainPanel` 0/0 in a 1296 px card. Card-level content
has **0 px** of its own padding; "padding inside a card" is the *cell inset* token applied to nested panels
and settings rows. Baseline 12 px of column padding buys gap/edge and nothing else.

## 1. Baseline — frame 0, columns 12, tokens 12 / 16

Frame box measured 0,0 → 1600×1000 (and 0,0 → 1280×800, 1100×800, 826×1000): it fills the window,
`padding: 0px`, `border-box`, grid `280px minmax(0,1fr) minmax(0,0px)`, `overflow: hidden`.

| viewport | sidebar col | sidebar card | center col | center card | rightrail col | rail card | gap | edge L | edge T | edge B | edge R | scrollW / innerW |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 1600×1000 | 280 @x0 | 256 @x12 | 1320 @x280 | 1296 @x292 | 24 @x1600 | 0 @x1612 | 24 | 12 | 12 | 12 | 12 | 1600 / 1600 |
| 1280×800 | 280 @x0 | 256 @x12 | 1000 @x280 | 976 @x292 | 24 @x1280 | 0 @x1292 | 24 | 12 | 12 | 12 | 12 | 1280 / 1280 |
| 1100×800 | 280 @x0 | 256 @x12 | 820 @x280 | 796 @x292 | 24 @x1100 | 0 @x1112 | 24 | 12 | 12 | 12 | 12 | 1100 / 1100 |
| 826×1000 | 56 @x0 | 48 @x4 | 770 @x56 | 762 @x60 | 8 @x826 | 0 @x830 | 8 | 4 | 4 | 4 | 4 | 826 / 826 |

At 826 `[data-dsh-bento-part="frame"]` carries `data-sidebar-collapsed`, and the theme's own
`…[data-sidebar-collapsed] { --dsh-bento-gutter: 4px }` rule overrides the token, so the rail is
8 gap / 4 edge regardless of what the token says. Right rail is collapsed
(`data-rightbar-collapsed`): its painted card is 0 px wide and its column is `2 × column padding`.
No horizontal overflow anywhere (`scrollWidth == innerWidth`).

## 2. Config A (target): frame 8, columns 8, gutter token 8 — and config B (frame 16 / columns 8)

Both injected, read back, and measured. Readback for A at 1600:
`--dsh-bento-gutter: 8px`, `--dsh-bento-cell-inset: 16px`, frame `padding: 8px`,
sidebar/center/rightbar `padding: 8px`, `::after inset 8px` on all three. B identical except frame `16px`.

| config | viewport | sidebar card | center card | rail col / card | gap | edge L | edge T | edge B | edge R | scrollW / innerW |
|---|---|---|---|---|---|---|---|---|---|---|
| **A** frame 8 / col 8 | 1600×1000 | 264 @x16 | 1288 @x296 | 16 / 0 @x1600 | **16** | **16** | **16** | **16** | **16** | 1600 / 1600 |
| **A** | 1280×800 | 264 @x16 | 968 @x296 | 16 / 0 @x1280 | **16** | **16** | **16** | **16** | **16** | 1280 / 1280 |
| **A** | 1100×800 | 264 @x16 | 788 @x296 | 16 / 0 @x1100 | **16** | **16** | **16** | **16** | **16** | 1100 / 1100 |
| **A** | 826×1000 | 40 @x16 | 738 @x72 | 16 / 0 @x826 | 16 | 16 | 16 | 16 | 16 | 826 / 826 |
| **B** frame 16 / col 8 | 1600×1000 | 264 @x24 | 1272 @x304 | 16 / 0 @x1592 | 16 | **24** | **24** | **24** | **24** | 1600 / 1600 |
| **B** | 1280×800 | 264 @x24 | 952 @x304 | 16 / 0 @x1272 | 16 | **24** | **24** | **24** | **24** | 1280 / 1280 |
| **B** | 1100×800 | 264 @x24 | 772 @x304 | 16 / 0 @x1092 | 16 | **24** | **24** | **24** | **24** | 1100 / 1100 |

Card widths before → after: sidebar 256 → 264 (+8), center 1296 → 1288 / 976 → 968 / 796 → 788 (−8).
No horizontal overflow introduced at any viewport in either config. Config B costs nothing in overflow and
exactly one column padding of edge: **24 px edge, 16 px gap** — it is the "what does 24 cost" data point,
and what it costs is the 8 px of center card width plus a visibly wider frame band.

**826 rail caveat, measured.** Unscoped, both A and B override the theme's collapsed rule: rail card
48 → 40 px and **11 sidebar descendants escape the painted card by up to 6 px**. Re-running the same sheet
scoped with `…[data-dsh-bento-part="frame"]:not([data-sidebar-collapsed])` leaves the rail exactly at its
baseline (cols 4, card 48 @x4, gap 8, edge 4, **0 escapes**) while the token still reads 16. So at 826 the
requested 16s are **not** delivered unless the collapsed rule is changed too; scoping is the safe default.

## 3. The token is coupled to Settings: the cube cap

Settings → General. Appearance is `._8HJdBW_cubeRow`: `display:flex`, `flex-wrap:wrap`, `gap:8px`, three
`[class*="themeCube"]` buttons at `flex-basis:180px`, height 84. The row reads **both** tokens through the
theme: `padding-inline: var(--dsh-bento-cell-inset)` and
`margin-inline: calc(-2 * var(--dsh-bento-gutter) - 1px)`. Across 18 measured (gutter, inset) pairs the
row width obeys, to the pixel and identically at 1600 and 1280 (the modal is a fixed 800 px, so viewport
does not matter). The row width depends only on the two tokens — frame padding does not enter it, confirmed
by measuring gutter 8 / inset 16 with frame padding 8 (row 548) and with frame padding 16 (row 548):

```
rowWidth = 556 + 2·(gutter − 12) − 2·(inset − 16)      one line ⇔ rowWidth ≥ 556 ⇔ inset ≤ gutter + 4
```

| gutter | inset | settings row `padding-inline` | row clientW | cube widths | cube y | one line? |
|---|---|---|---|---|---|---|
| 12 | 16 | 16 | 556 | 180 / 180 / 180 | 356 / 356 / 356 | **yes, 0 px slack** (baseline) |
| 12 | 17 | 17 | 554 | 273 / 273 / 554 | 356 / 356 / 448 | no — System wraps |
| 12 | 20 | 20 | 548 | 270 / 270 / 548 | 356 / 356 / 448 | **no — System wraps** |
| 14 | 18 | 18 | 556 | 180 / 180 / 180 | 358 / 358 / 358 | yes |
| 14 | 19 | 19 | 554 | 273 / 273 / 554 | 358 / 358 / 450 | no |
| 16 | 16 | 16 | 564 | 182.66 / 182.67 / 182.67 | 360 / 360 / 360 | yes, 8 px slack |
| **16** | **20** | **20** | **556** | **180 / 180 / 180** | **360 / 360 / 360** | **yes, 0 px slack** |
| 16 | 21 | 21 | 554 | 273 / 273 / 554 | 360 / 360 / 452 | no |
| 16 | 24 | 24 | 548 | 270 / 270 / 548 | 360 / 360 / 452 | no |
| 18 | 22 | 22 | 556 | 180 / 180 / 180 | 362 / 362 / 362 | yes |
| 18 | 23 | 23 | 554 | 273 / 273 / 554 | 362 / 362 / 454 | no |
| 20 | 20 | 20 | 564 | 182.66 / 182.67 / 182.67 | 364 / 364 / 364 | yes |
| 20 | 24 | 24 | 556 | 180 / 180 / 180 | 364 / 364 / 364 | yes |
| **8** | **10** | 10 | 560 | 181.33 / 181.34 / 181.33 | 352 / 352 / 352 | yes |
| **8** | **11** | 11 | 558 | 180.66 / 180.67 / 180.67 | 352 / 352 / 352 | yes |
| **8** | **12** | 12 | 556 | 180 / 180 / 180 | 352 / 352 / 352 | yes, 0 px slack |
| **8** | **13** | 13 | 554 | 273 / 273 / 554 | 352 / 352 / 444 | no |
| **8** | **16** | 16 | 548 | 270 / 270 / 548 | 352 / 352 / 444 | **no — System wraps** |
| **8** | **20** | 20 | **540** | 266 / 266 / 540 | 352 / 352 / 444 | **no — System wraps** |

Config B context: frame padding does not reach the settings row. Measured with frame `16px`,
columns 8: gutter 8 / inset 16 → row **548**, cubes 270 / 270 / 548, y 352/352/444, one line **false**;
gutter 8 / inset 20 → row **540**, cubes 266 / 266 / 540, y 352/352/444, **false**;
gutter 12 / inset 16 → row **556**, 180 / 180 / 180, **true**. So the row tracks the two tokens only,
never the frame.

So: **config A as specified (gutter token 8) cannot carry inset 20.** With the token at 8 the cubes wrap
from inset 13 up; at the current inset 16 the row is 548 and System drops to a second line (y 444 vs 352).
Config B has the same token and the same failure. Neither cube layout pushed outside the modal
(row stays 12 px inside the options box; 0 settings descendants past the modal border in every case).

**Minimum change that keeps the cubes on one line:**
* keep the token at 12 → inset ≤ 16 (i.e. no inset change at all, 0 px slack);
* token 8 → inset ≤ 12;
* token 16 → inset ≤ 20 (**exactly** the target inset, 0 px slack); 21 wraps;
* token 18 → inset ≤ 22; token 20 → inset ≤ 24.

**Smallest inset that keeps all three on one line at each gutter:** 8 → 12; 12 → 16; 14 → 18;
16 → 20; 18 → 22; 20 → 24. The rule is `inset ≤ gutter + 4`; there is no fixed "smallest inset"
independent of the gutter, which is why the one-token edit (gutter 8) forces the inset down to 12.

## 4. The layout that delivers all three: frame 8 / columns 8 / `::after` 8, token 16 / inset 20

Card geometry comes from frame padding + column padding + the `::after` inset (all 8). The *gutter token*
is kept at 16 so the Settings rhythm and cube row stay legal. Readback at 1600:
tokens `16px` / `20px`, frame `8px`, columns `8px`, `::after inset 8px` (all three), settings row
`padding-inline 20px` / `margin-inline -33px`, header padding 20 px — all rules won.

| viewport | sidebar card | center card | rail col / card | gap | edge L | edge T | edge B | edge R | scrollW / innerW | content escaping card |
|---|---|---|---|---|---|---|---|---|---|---|
| 1600×1000 | 264 @x16 | 1288 @x296 | 16 / 0 @x1600 | **16** | **16** | **16** | **16** | **16** | 1600 / 1600 | 0 |
| 1280×800 | 264 @x16 | 968 @x296 | 16 / 0 @x1280 | **16** | **16** | **16** | **16** | **16** | 1280 / 1280 | 0 |
| 1100×800 | 264 @x16 | 788 @x296 | 16 / 0 @x1100 | **16** | **16** | **16** | **16** | **16** | 1100 / 1100 | 0 |
| 826×1000 | 48 @x4 | 762 @x60 | 8 / 0 @x830 | 8 | 4 | 4 | 4 | 4 | 826 / 826 | 0 |

Settings at this layout: modal 800×800 @ (400,100); Appearance row 556 × 84 @ (616,360) with cubes
180 / 180 / 180 all at y 360 — **one line, 0 px slack**; modal untouched (0 descendants outside).

The 826 row is the scoped variant: the collapsed rail keeps the theme's own 4 px rhythm and 0 escapes.
Changing the collapsed rule to satisfy 16/16 there is possible (unscoped A measured gap 16 / edge 16) but
costs the rail 8 px of card width and 11 elements overflowing it — not worth it for a 56 px rail.

## 5. Sidebar rows

`[data-row-key]` returns 13 nodes in the sidebar DOM (6 `session:` + 6 `workspace:` + 1 `overflow:`);
only the 12 session/workspace rows were measured. **D68's "13 of 13 session rows overflow at padding 14"
is not reproducible here** — there are 6 session rows, and the truncation count does not move between
column padding 8 and 20. Truncation tested as `scrollWidth > clientWidth + 1` on the ellipsis leaf.
Session title `clientWidth` per row at padding 8: 201 / 160 / 178 / 178 / 174 / 174 px; at padding 12:
193 / 152 / 170 / 170 / 166 / 166 px (the last two carry a time chip).

| column padding | sidebar card | session title clientW (all 6 rows) | sessions truncated | workspaces truncated | row spill past card | workspace row `margin-block-start` |
|---|---|---|---|---|---|---|
| 8 (final) | 264 | 201 / 160 / 178 / 178 / 174 / 174 | **2 / 6** | **1 / 6** | 0 | 16 (token) |
| 10 | 260 | 197 / 156 / 174 / 174 / 170 / 170 | 2 / 6 | 1 / 6 | 0 | – |
| 12 (baseline) | 256 | 193 / 152 / 170 / 170 / 166 / 166 | **2 / 6** | **1 / 6** | 0 | 12 |
| 13 | 254 | 191 / 150 / 168 / 168 / 164 / 164 | 2 / 6 | 1 / 6 | 0 | – |
| 14 | 252 | 189 / 148 / 166 / 166 / 162 / 162 | **2 / 6** | **1 / 6** | 0 | – |
| 16 | 248 | 185 / 144 / 162 / 162 / 158 / 158 | 2 / 6 | 1 / 6 | 0 | – |
| 18 | 244 | 181 / 140 / 158 / 158 / 154 / 154 | 2 / 6 | 1 / 6 | 0 | – |
| 20 | 240 | 177 / 136 / 154 / 154 / 150 / 150 | 2 / 6 | 1 / 6 | 0 | – |

Identical at 1280×800 (the sidebar is a fixed 280 px column at both widths).

Offenders and their requirement: "Debug QR Cloudflare host error" needs 209 px (has 166 at 12, 174 at 8),
"Claude Code Feature to DSH" needs 190 (166 → 174), "GHL_Workflow_JSON_Extension" needs 214
(195 → 203). Dropping column padding 12 → 8 gives every row 8 px more and still truncates the same three
rows. Nothing spills outside the painted card at 1600/1280/1100 in any layout; at 826 only the unscoped
injection leaked (§2).

## 6. Verdict — which values are jointly achievable

**All three requested values are jointly achievable at 1600×1000 and 1280×800 — but not with the
one-token model, and not by the shortest edit (frame 8 + token 8).** They split into two mechanisms:

* gap 16 and window edge 16 come from **frame padding 8 + column padding 8** (`::after inset 8`);
* inset 20 comes from **`--dsh-bento-cell-inset: 20`**, which is only legal while
  **`--dsh-bento-gutter: 16`** (cube row 556 = 3×180 + 2×8, one line, 0 px slack) or higher.

The lead's corrected config A (frame 8 / columns 8 / token 8) does deliver gap 16 + edge 16 as predicted —
measured 16/16 at 1600, 1280, 1100 — but it caps the inset at 12 and breaks the Settings appearance row.
Config B (frame 16 / columns 8) was also run: gap 16, edge 24 at every viewport; that 24 px edge costs the
center card another 16 px (1272 vs 1288 at 1600) and nothing else. Both are recorded above; only the
two-mechanism layout satisfies the full request.

## 7. Recommendation

Set the card geometry as fixed pixels on the frame and columns, and keep the gutter token for the
chrome (settings, workspace rhythm, cube row):

```css
html[data-dsh-bento] {
  --dsh-bento-gutter: 16px;      /* settings/cube-row rhythm — NOT the card gap */
  --dsh-bento-cell-inset: 20px;  /* nested panels + settings rows             */
}
html[data-dsh-bento] [data-dsh-bento-part="frame"]:not([data-sidebar-collapsed]) {
  padding: 8px; box-sizing: border-box;
}
html[data-dsh-bento] [data-dsh-bento-part="frame"]:not([data-sidebar-collapsed]) [data-dsh-bento-part="sidebar"],
html[data-dsh-bento] [data-dsh-bento-part="frame"]:not([data-sidebar-collapsed]) [data-dsh-bento-part="center"],
html[data-dsh-bento] [data-dsh-bento-part="frame"]:not([data-sidebar-collapsed]) [data-dsh-bento-part="rightbar"] {
  padding: 8px;
}
html[data-dsh-bento] [data-dsh-bento-part="frame"]:not([data-sidebar-collapsed]) [data-dsh-bento-part="sidebar"]::after,
html[data-dsh-bento] [data-dsh-bento-part="frame"]:not([data-sidebar-collapsed]) [data-dsh-bento-part="center"]::after,
html[data-dsh-bento] [data-dsh-bento-part="frame"]:not([data-sidebar-collapsed]) [data-dsh-bento-part="rightbar"]::after {
  inset: 8px;
}
```

| wanted | delivered | measured at |
|---|---|---|
| gap 16 | 16 | 1600, 1280, 1100 |
| window edge 16 (L/T/B/R) | 16 | 1600, 1280, 1100 |
| card / nested-panel inset 20 | 20, cubes on one line | settings row & header = 20 px, cube row 556 / y equal |
| no horizontal overflow | `scrollWidth == innerWidth` | 1600, 1280, 1100, 826 |

**What has to give.** Not the inset — the cube row's slack. At gutter 16 / inset 20 the row is exactly
556 px, so inset 21 wraps System (row 554, y 452). If headroom is wanted, raise the gutter to 18 (row 560)
or 20 (row 564); gap and edge stay 16/16 because they no longer read the token. The invariant is
`inset ≤ gutter + 4`.

The **short edit** (frame 8 + columns 8 + `--dsh-bento-gutter: 8`) does deliver gap 16 / edge 16 — measured
— but it breaks the Settings Appearance row (row 548, System wraps) and caps the inset at 12. It is a valid
"gap and edge only" option; it is not the owner's three-value request.

Do not forget: scope the frame/column override with `:not([data-sidebar-collapsed])`, or the 826 rail
loses 8 px of card width and 11 of its elements overflow the painted card.

## Not measured

* Appearance cubes at 1100 and 826 — the modal is a fixed 800 px wide, so the row width is viewport-independent;
  both were measured at 1600 and 1280 only. 826 has no session rows rendered (rail collapsed), so its row
  table is empty there.
* `[data-bento-detail]` / `_detailSections > section` padding at inset 20 on a real session-detail panel
  (no detail panel was opened; only Settings consumes the inset in this run).
* Dark theme, browser zoom other than 100 %, OS font scaling, non-headless window chrome.
* Right rail expanded: the rightbar is collapsed on this profile, so its card is 0 px wide in every table.


---

## Appendix — correction, added after the change shipped: the wrap was disarmable

This section is appended to the measurement above, not a rewrite of it. Every number in
sections 1-6 was measured and stands. What follows is the one assumption the verdict rests on
that turned out to be wrong, and the two places where the shipped change deliberately differs.

### 8.1 The cube row did not have to wrap

Section 5 measured the Appearance row's shortage as a hard cap: at gutter 12 / inset 20 the row
is 548 for a 556 control, so "System" wrapped, and the verdict requires the gutter to rise to 16
to hand the 8px back.

That is what the row does under the host's own `flex-wrap: wrap`. It is not what the row has to
do, because the host also declares `flex-shrink: 1` on each cube. With the wrap turned off the
row resolves the same 8px shortage by narrowing all three cubes:

| gutter | inset | wrap | row | cubes | one line | label clipped |
|---|---|---|---|---|---|---|
| 12 | 20 | wrap | 548 | 270 / 270 / 548 | **no** | no |
| 12 | 20 | **nowrap** | 548 | **177.33 / 177.33 / 177.33** | **yes** | no |
| 12 | 24 | nowrap | 540 | 175 / 175 / 175 | yes | no |

Measured in both themes at 1600 and 1280; no cube's label or preview surface clips, and the
control's box is unchanged at 84px tall. So the constraint in section 5 is real but conditional:
inset 20 requires EITHER a gutter of 16 OR a row that is allowed to share its width.

### 8.2 What shipped, and why the gutter stayed at 12

The shipped change takes the second option and leaves `--dsh-bento-gutter` at 12.

Raising it to 16 would not have been a containing change: the gutter is the rhythm INSIDE a
card, not a card distance. It positions the settings region's margin from the modal panel, the
settings rows' hover bleed, the gap above a workspace heading, and the detail board's grid gap -
all measured at 12 in D68 and D74. Raising it to satisfy one control would widen every one of
those, including a detail board whose grid gap was set by its own measurement.

The row is therefore fixed instead, which is the narrower change: one keyword on one element,
with the host keeping ownership of the cubes' widths, gaps, radii and order.

### 8.3 The three card distances are three tokens, not padding rules

Section 7 recommends writing the frame and column padding as fixed pixels. The shipped change
uses three named tokens instead - `--dsh-bento-card-gap` 16, `--dsh-bento-card-pad` 8,
`--dsh-bento-window-pad` 8 - so that the two relationships the layout depends on are asserted
rather than implied:

    gap between two cards = 2 x card-pad
    window edge to card   = window-pad + card-pad

A gate checks the arithmetic, which a literal 8px in two places cannot be checked against. The
measured result is identical to section 7's: gap 16, edge 16 on all four sides, cards
264 / 1288 / 0 at 1600 and 256 / ... at the rail, no horizontal overflow.

The rail caveat in section 7 is carried over as written: the frame padding rule is scoped
` :not([data-sidebar-collapsed]) `, and the rail instead sets card-pad 4 / window-pad 0, which
reproduces the geometry it had before the change rather than inventing one. Measured collapsed:
card at x=4, 48px wide, 8px gap to the centre card.

### 8.4 What this leaves unverified

- Inset 20 against a HOST gutter other than 12 was never measured, because the gutter is now a
  fixed theme token and not a user setting.
- The nowrap row was measured at 1600 and 1280 only; at a viewport narrow enough to shrink the
  Settings modal (measured: 820px, modal 800 -> smaller), the row wraps again and the cubes
  return to two lines. That is the host's own responsive behaviour and it was left alone.
