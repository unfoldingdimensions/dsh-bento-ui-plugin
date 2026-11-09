# Reference deltas — measured CSS from the two saved design files

Measured 2026-11-09. **Evidence extraction only.** Every value below is quoted from the
file named in its source tag; nothing is inferred from what the design "probably" looks
like. Where a thing does not exist, the entry says **not present in this file** and gives
the search that returned zero hits.

## Source tags

Two saved HTML files were read. Both are bundler exports: the visible markup is stored
as an escaped JSON string inside a `<script type="__bundler/template">` tag, so a raw
grep for `font-size` on the file returns nothing useful. The markup was extracted
(JSON-decode → child resources → imported components) and that decoded markup is what is
quoted. Values are unchanged by decoding.

| Tag | File | Size | What it contains |
|---|---|---|---|
| **PD** | `C:\Users\ADMIN\Downloads\RSI Paid Marketing – Bento – Harness – Plugin detail.html` | 521,196 B | One page: "Deepseek Harness – Plugin detail". Plugin-detail screen: hero, components list, source card, dark update tile. Bundles its sidebar component (`HarnessSidebar.dc.html`) and 267 KB of WOFF2 font-face CSS. |
| **SET** | `C:\Users\ADMIN\Downloads\RSI Paid Marketing – Bento.html` | 5,409,827 B | 14 page bundles: 12 dashboard pages (Paid Marketing in blue and orange, Funnels, Organic, Masterclass, Whole Team, Closer Performance, Payments, Failed Payments, Projection, Data Checks, Admin Settings), plus `RSI Sidebar` and `RSI Dashboard Theme Tokens`. Has **no** plugin-detail page and **no** Harness chat UI. |

Both files carry an identical `THEMES` object (verified: 13 files share one variant,
byte-identical after whitespace normalisation). All colours below resolve through it:

```js
blue:   { bg:'#EDF0F4', surface:'#FFFFFF', panel:'#F3F6FC', border:'#E3E7EE', divider:'#EEF1F5',
          control:'#D5DCE7', ink:'#0F172A', 'ink-2':'#334155', muted:'#5B6474',
          'ink-on-dark':'#CBD5E1', accent:'#2F6BEB', 'accent-fill':'#2F6BEB',
          'accent-ink':'#1E4FBF', 'accent-soft':'#E8EFFE', 'accent-line':'#DCE5FB',
          link:'#2F6BEB', 'link-hover':'#1E4FBF', 'data-2':'#6E97F2', 'data-3':'#A9C1F7',
          'data-4':'#CFDCFB', partial:'#F2C9A6', rule:'#C9D3E4',
          glow:'rgba(47,107,235,0.12)', 'warn-ink':'#B4540F', 'warn-bg':'#FDF1E7' },
orange: { bg:'#F1EFED', surface:'#FFFFFF', panel:'#FBF6F2', border:'#E7E3DF', divider:'#F1EDE9',
          control:'#DDD6CF', ink:'#1C1917', 'ink-2':'#44403C', muted:'#615A54',
          'ink-on-dark':'#D6D3D1', accent:'#E2600F', 'accent-fill':'#C2410C',
          'accent-ink':'#9A3A0A', 'accent-soft':'#FFF1E7', 'accent-line':'#F6D9C3',
          link:'#B0400A', 'link-hover':'#8A3208', 'data-2':'#F28A4B', 'data-3':'#F7B98E',
          'data-4':'#FBD9C2', partial:'#D6D3D1', rule:'#E3D3C6',
          glow:'rgba(234,106,31,0.14)', 'warn-ink':'#A3261E', 'warn-bg':'#FDECEC' }
```

Source: **PD** `renderVals()` `const THEMES = {...}`; **SET** the same object repeated in
all 13 theme-aware page bundles. Both files also contain a self-documenting table of the
token names in `RSI Dashboard Theme Tokens`:

```js
['glow',       'Floating badge shadow', 'rgba(47,107,235,.12)', 'rgba(234,106,31,.14)'],
['ink',        'Main text, dark tiles, active segment', '#0F172A', '#1C1917'],
['accent-soft','Tints: active nav, rate pills', '#E8EFFE', '#FFF1E7'],
['accent-line','Borders on tinted items',       '#DCE5FB', '#F6D9C3'],
```

Source: **SET** `RSI_Dashboard_Theme_Tokens.html`, `renderVals()` token array.

### How styles are declared (matters for reading the quotes)

There is **no stylesheet for the page components**. Every layout and type rule is an
inline `style="..."` attribute on the element. The only real CSS rules in either file are:

```css
body{margin:0;background:#EDF0F4}
a{color:var(--link)}a:hover{color:var(--link-hover)}
.num{font-variant-numeric:tabular-nums}
.mono{font-family:'JetBrains Mono',ui-monospace,monospace}
@media (max-width: 1000px){ .bento > .c{grid-column: 1 / -1 !important} }
@media (max-width: 900px){ .pane-side{flex-basis:100% !important; max-width:none !important} }
```

Source: **PD** `<helmet><style>` block (the chart pages in **SET** use a wider variant:
`@media (max-width: 1100px){ .bento > .c{grid-column: span 6 !important} .bento > .wide{grid-column: 1 / -1 !important} }`).

Consequence: "selector" below means the element + its inline style, since that is the only
place the declaration exists. Class names are sparse — `.num`, `.mono`, `.bento`, `.c`,
`.side`, `.pane-side`.

---

## 1. TYPE SCALE

Both files run one typeface for everything: `font-family: Inter, system-ui, sans-serif`
(the `@font-face` set ships 28 Inter faces for weights 400/500/600/700 and 12 JetBrains
Mono faces for 400/500). Monospace appears only for paths, package names and code.

### 1a. Page titles — 20px and above

There are **two** real `h1` tiers in the product pages — `32px` and `26px` — plus a third
on the reference sheet that should not be adopted. All carry `letter-spacing: -0.025em`;
the two product tiers are `font-weight: 700`.

```css
/* 32px page title — 12 page bundles in SET, always the same five declarations */
<h1 style="margin: 0; font-size: 32px; line-height: 1.15; letter-spacing: -0.025em; font-weight: 700">Paid Marketing</h1>
```
Source: **SET**, identical `h1` inline style in all 12 content pages:
`RSI_Paid_Marketing.html`, `RSI_Paid_Marketing_Orange_.html`, `RSI_Funnels.html`,
`RSI_Organic.html`, `RSI_Masterclass.html`, `RSI_Whole_Team.html`,
`RSI_Closer_Performance.html`, `RSI_Payments.html`, `RSI_Failed_Payments.html`,
`RSI_Projection.html`, `RSI_Data_Checks.html`, `RSI_Admin_Settings.html`.

```css
/* 26px page title — the plugin-detail page's own h1 */
<h1 style="margin: 0; font-size: 26px; font-weight: 700; letter-spacing: -0.025em">Bento Layout</h1>
```
Source: **PD**, hero section. Note: **no `line-height` declared** here, and the weight is
declared explicitly rather than inherited.

```css
/* 36px — only on the theme-token sheet, which is a reference sheet, not a product page */
<h1 style="margin: 0; font-size: 36px; letter-spacing: -0.025em">Blue and Orange, one set of names</h1>
```
Source: **SET** `RSI_Dashboard_Theme_Tokens.html`. It declares no `font-weight` at all, so
it renders at the browser default. **Do not adopt the 36px tier from this.**

### 1b. Section headings

Two sizes carry almost all `h2`s, and which one is used tracks the card's size, not its
nesting depth. A third tier exists only on the 2×2 metric tiles.

```css
/* 17px — full-width and large cards; 29 occurrences across the corpus */
<h2 style="margin: 0; font-size: 17px; font-weight: 600">From opt-in to sale</h2>
<h2 style="margin: 0 6px 0 0; font-size: 17px; font-weight: 600">Components</h2>
```
Source: **PD** (Components, Source) and **SET** (most pages).

```css
/* 15px — small/span-2 and span-3 cards, and every dark tile; 49 occurrences */
<h2 style="margin: 0; font-size: 15px; font-weight: 600; color: var(--ink-2)">Ad Spend</h2>
<h2 style="margin: 0; font-size: 15px; font-weight: 600; color: var(--ink-on-dark)">Update</h2>
```
Source: **SET** `RSI_Paid_Marketing.html` (Ad Spend, Revenue, Sales, Opt-ins, Discovery
calls…) and **PD** dark "Update" tile.

```css
/* 14px — the 2×2 metric tiles use a third tier; 5 occurrences, all in one page */
<h2 style="margin: 0; font-size: 14px; font-weight: 600; color: var(--ink-on-dark)">Sales</h2>
```
Source: **SET** `RSI_Projection.html`.

Neither file declares a `line-height` on any `h2`. Neither declares `text-transform`,
`letter-spacing` or a heading font on any heading. Three `h2`s in the tokens sheet declare
no `font-weight` at all (`17px`, unweighted) — a reference-sheet artifact, not a tier.

### 1c. Eyebrow / small uppercase labels

Every uppercase label in the corpus is `font-weight: 600` and uses a positive tracking
between `0.05em` and `0.08em` — **with one 700-weight exception** (the HARNESS badge).
Tracking grows as size falls: `0.05em` at 12px, `0.06em` at 11px, `0.08em` at 10px.

```css
/* 11px uppercase group label — the canonical eyebrow. SET sidebar + PD's bundled sidebar */
<span style="font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--muted); padding: 0 10px 6px">Workspaces</span>
```
Source: **SET** `RSI_Sidebar.html`; **PD** bundled `HarnessSidebar` uses the identical
declaration with a different label.

```css
/* 12px uppercase table header — 0.05em, not 0.06em */
<div style="display: grid; grid-template-columns: 1.1fr 1.6fr 1fr 1fr; gap: 12px; padding: 0 8px 10px; font-size: 12px; font-weight: 600; color: #5B6474; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #EEF1F5">
```
Source: **SET** `RSI_Dashboard_Theme_Tokens.html`.

```css
/* 10px / 0.08em badge — a literal-caps badge, no text-transform (the text is typed in caps) */
<span style="font-size: 10px; font-weight: 700; letter-spacing: 0.08em; color: #FFFFFF; background: var(--ink); border-radius: 6px; padding: 3px 6px">HARNESS</span>
```
Source: **PD** bundled `HarnessSidebar`.

```css
/* 12px uppercase label on the dark sidebar tile, colour inverted */
<span style="font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-on-dark)">Today</span>
```
Source: **PD** bundled `HarnessSidebar`, usage tile.

**Not present:** the PD page body itself contains **zero** `text-transform` declarations
(`[regex]::Matches($pd,'text-transform') → 0`). The eyebrow labels only reach PD through
its bundled sidebar child. If the theme wants an eyebrow on a plugin page, SET's
11px/600/0.06em/uppercase is the only measured precedent.

### 1d. Body text

```css
/* 14px — the page subtitle directly under h1. Only 14px body size in the set. */
<p style="margin: 0; font-size: 14px; color: var(--muted); max-width: 620px">LM A AU, VSL AU and MC A AU: ad spend, opt-ins, strategy sessions and sales.</p>
```
Source: **SET**, 12 pages, identical.

```css
/* 15px / line-height 1.6 — the plugin-detail description paragraph. The only line-height 1.6 in either file. */
<p style="margin: 0; padding: 16px 14px 10px; font-size: 15px; line-height: 1.6; color: var(--ink-2); max-width: 820px">
```
Source: **PD**, hero section.

```css
/* 13px — the dense card body / label size */
<span style="font-size: 13px; line-height: 1.5; color: var(--ink-2)">Turns the three-column shell into a raised card grid…</span>
<span style="font-size: 13px; color: var(--muted)">Qualified app %</span>
<div style="display: flex; flex-direction: column; gap: 6px; font-size: 13px; color: var(--muted)">
```
Source: **PD** (first, `line-height: 1.5` — the only 1.5 in either file) and **SET**.

### 1e. Captions / meta text

```css
/* 12px caption — 218 declarations, the single most-used size in the corpus */
<span style="font-size: 12px; color: var(--muted)">Combined · rates from totals</span>
<span style="margin-left: auto; font-size: 12px; color: var(--muted)">As of 31 Oct · Sydney time</span>
```
Source: **SET** `RSI_Paid_Marketing.html` etc.

```css
/* 11px source line — sits at the far edge of a card */
<span style="margin-left: auto; font-size: 11px; color: var(--muted)">Meta Marketing API · read 31 Oct</span>
```
Source: **SET** `RSI_Paid_Marketing.html`.

### 1f. Buttons

Buttons inherit the family with `font: inherit`, then override size and weight explicitly.
Four tiers exist, and the 14px/600 "New Session" call to action is the one the Harness
sidebar uses for its primary action.

```css
/* 13px / 600 — primary and segmented buttons */
<button type="button" style="min-height: 40px; padding: 0 16px; border: 0; border-radius: 12px; background: #FFFFFF; color: var(--ink); font: inherit; font-size: 13px; font-weight: 600; cursor: pointer">Check for updates</button>
```
Source: **PD**, dark update tile.

```css
/* 13px / no weight (inherits) — unselected segments */
<button type="button" aria-pressed="false" style="min-height: 36px; padding: 0 14px; border: 0; border-radius: 10px; background: transparent; color: var(--ink-2); font: inherit; font-size: 13px">Weekly</button>
```
Source: **SET** `RSI_Paid_Marketing.html`.

```css
/* 13px / 500 — the back-link pill, the only 500-weight control in PD */
<a href="HarnessPlugins.dc.html" style="align-self: flex-start; min-height: 32px; display: inline-flex; align-items: center; gap: 6px; padding: 0 12px 0 8px; border-radius: 999px; background: var(--panel); color: var(--ink-2); font-size: 13px; font-weight: 500; text-decoration: none">Plugins</a>
```
Source: **PD**.

```css
/* 14px / 600 — the "New Session" call to action. The only 14px/600 button measured. */
<a href="Harness.dc.html" style="min-height: 44px; display: flex; align-items: center; justify-content: center; gap: 8px; border: 1px solid var(--accent-line); border-radius: 14px; background: var(--accent-soft); color: var(--accent-ink); font-size: 14px; font-weight: 600; text-decoration: none">New Session</a>
```
Source: **PD** bundled `HarnessSidebar`.

### 1g. Numerals

Every number carries `class="num"` → `font-variant-numeric: tabular-nums`. Metric values
are `700` with tracking that scales with size (`-0.02em` at 26–30px, `-0.03em` at 34–44px)
and `line-height: 1` on the largest tier.

```css
<span class="num" style="font-size: 44px; font-weight: 700; letter-spacing: -0.03em; line-height: 1">19</span>
<span class="num" style="font-size: 40px; font-weight: 700; letter-spacing: -0.03em; line-height: 1">A$104,492</span>
<span class="num" style="font-size: 34px; font-weight: 700; letter-spacing: -0.03em; line-height: 1">A$136,319</span>
<span class="num" style="font-size: 30px; font-weight: 700; letter-spacing: -0.02em; line-height: 1">{{cpaL}}</span>
<span class="num" style="font-size: 28px; font-weight: 700; letter-spacing: -0.02em; line-height: 1">38.4%</span>
<span class="num" style="font-size: 26px; font-weight: 700; letter-spacing: -0.02em; line-height: 1.1">31 Oct, 2:39 am</span>
<span class="num" style="font-size: 22px; font-weight: 700">A$437</span>
<span class="num" style="font-size: 20px; font-weight: 700">1,877</span>
<span class="num" style="font-size: 16px; font-weight: 600; color: var(--ink)">A$55.67</span>
<span class="num" style="font-size: 12px; color: var(--muted)">$0</span>
```
Source: **SET** (44/40/34/30/28/22/20/16) and **PD** bundled sidebar (26). Note 22px and
20px declare **no** tracking — the negative tracking starts at 26px.

### 1h. Type scale summary (measured frequencies)

Counts below are declarations across the 17 markup files that make up the corpus:
**PD** page + **PD** bundled sidebar, **SET**'s 13 decoded page bundles (12 content pages +
`RSI_Sidebar` + the tokens sheet), and **SET**'s sidebar import. **Inline declarations
repeat, so these are not distinct-component counts — they describe which sizes the design
actually reaches for.**

| Size | Count | Adopted role |
|---|---|---|
| 44px | 7 | biggest KPI |
| 40px | 14 | KPI |
| 36px | 2 | reference-sheet h1 only (unweighted — do not adopt) |
| 34px | 17 | KPI |
| 32px | 12 | page h1 (exactly one per page) |
| 30px | 6 | secondary KPI |
| 28px | 4 | KPI |
| 26px | 7 | KPI / brand |
| 24px | 1 | tile figure |
| 22px | 11 | tile figure |
| 20px | 14 | step figure |
| 18px | 1 | email address |
| 17px | 33 | h2 (large card), brand |
| 16px | 12 | sub-metric |
| 15px | 56 | h2 (small/dark card), detail body |
| 14px | 46 | page subtitle, nav item, CTA button |
| 13px | 152 | body, buttons |
| 12.5px | 1 | mono code in tokens sheet |
| 12px | 218 | caption, chip, pill |
| 11px | 34 | eyebrow, source line, meta chip |
| 10px | 1 | HARNESS badge |

Letter-spacing values that exist in the corpus, complete list with counts:
`-0.03em` (38), `-0.02em` (17), `-0.025em` (14), `0.06em` (8), `-0.01em` (3),
`0.08em` (1), `0.05em` (1). **No other tracking exists.** Every negative value is on a
heading or a numeral; every positive value is on an uppercase label.

Font weights used, complete list with counts: `400` (117), `500` (182), `600` (393),
`700` (216), plus templated `{{it.weight}}` bindings. **No 300, no 800, no 900.** Weight
600 is the dominant weight of the corpus, not 700.

---

## 2. ACCENT SHADOW / GLOW

There are **two accent-tinted shadow forms** in the entire corpus — `0 6px 16px` and
`0 10px 24px`, both coloured by the `--glow` token. **11 elements carry one, across 11 of
the 17 markup files** (9 written as `var(--glow)`, 1 hard-coded orange literal, 1 the
larger avatar variant). There is no other non-neutral shadow anywhere: the only other
shadows in the corpus are the neutral `0 1px 3px rgba(15,23,42,0.25)` on switch thumbs.

### 2a. The glow shadows

```css
/* The badge / icon glow — 9 declarations using var(--glow), plus 1 more written as a
   hard-coded orange literal on the orange page. THE accent shadow. */
box-shadow: 0 6px 16px var(--glow)
```

```css
/* The avatar glow — 1 declaration, slightly larger and softer */
box-shadow: 0 10px 24px var(--glow)
```
Source: **SET** `RSI_Closer_Performance.html`, 64×64 avatar.

The one literal-colour exception — the orange variant of the badge, which bypasses the
token entirely because that page inlines all its colours:

```css
<span class="num" style="font-size: 12px; font-weight: 600; color: #9A3A0A; background: #FFFFFF; border: 1px solid #F6D9C3; border-radius: 999px; padding: 5px 10px; box-shadow: 0 6px 16px rgba(234,106,31,0.14)">Peak A$5,249 · 12 Oct</span>
```
Source: **SET** `RSI_Paid_Marketing_Orange_.html`. Note `#F6D9C3` is `accent-line` and
`#9A3A0A` is `accent-ink` in the orange theme — the same treatment, spelled out.

Resolved literals, both themes:

| Theme | `--glow` literal | Resolved shadow |
|---|---|---|
| blue | `rgba(47,107,235,0.12)` | `0 6px 16px rgba(47,107,235,0.12)` |
| orange | `rgba(234,106,31,0.14)` | `0 6px 16px rgba(234,106,31,0.14)` |

Source: **PD** and **SET** `THEMES` object, key `glow`. The tokens sheet annotates it:
`['glow', 'Floating badge shadow', …]` — the design's own word for this is a **floating
badge** shadow, not a focus ring and not a card shadow.

### 2b. Elements that pair an accent 1px border with a shadow

This pairing **exists**, and it is the most repeated composite treatment in the corpus:
**10 elements carry it** — 9 distinct design elements plus the orange-theme duplicate of
one badge. Every one of them is either a 12px pill badge or a 60×60 icon tile. All use the
identical declaration order.

```css
/* The canonical pairing — accent-line border + glow, on a 999px pill.
   8 occurrences in the blue theme; the orange page repeats it with literals. */
<span class="num" style="font-size: 12px; font-weight: 600; color: var(--accent-ink); background: var(--surface); border: 1px solid var(--accent-line); border-radius: 999px; padding: 5px 10px; box-shadow: 0 6px 16px var(--glow)">Peak A$5,249 · 12 Oct</span>
```
Source: **SET** — `RSI_Paid_Marketing.html` ("Peak A$5,249 · 12 Oct"),
`RSI_Funnels.html` ("…spend"), `RSI_Organic.html` ("Website · 59% of organic revenue"),
`RSI_Masterclass.html` ("35.8% of registered attended"), `RSI_Payments.html`
("Best day A$32,224 · 9 Oct"), `RSI_Failed_Payments.html` ("64% insufficient funds"),
`RSI_Projection.html` ("Month finished · actuals"), `RSI_Whole_Team.html`
("19 of 36 sales from paid funnels"). Exactly one per page, always in a card header row,
sitting beside a plain `border: 1px solid var(--border)` pill with no shadow on 7 of the
8 pages (`RSI_Funnels.html` has the glowing badge but not the plain partner).

```css
/* The same pairing on a rounded square instead of a pill — the PD hero icon. */
<span style="width: 60px; height: 60px; border-radius: 18px; background: var(--surface); border: 1px solid var(--accent-line); color: var(--accent-ink); display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 16px var(--glow)">
```
Source: **PD**, hero section. **This is the only accent-border + glow element in PD.**

```css
/* Same idea, larger radius, on an avatar */
<div style="width: 64px; height: 64px; border-radius: 20px; background: var(--accent-fill); color: #FFFFFF; display: flex; align-items: center; justify-content: center; font-size: 22px; font-weight: 700; box-shadow: 0 10px 24px var(--glow)">BD</div>
```
Source: **SET** `RSI_Closer_Performance.html`. **No border** on this one — fill + glow only.

### 2c. What is NOT accent-tinted

Every other shadow in either file is neutral. Complete list:

```css
box-shadow: 0 1px 3px rgba(15,23,42,0.25)   /* switch thumb — PD (×2) and SET Admin Settings (×2) */
box-shadow: 0 1px 4px rgba(0,0,0,0.12)      /* bundler chrome, not design — both files */
box-shadow:0 1px 4px rgba(0,0,0,0.08)       /* bundler chrome, not design — both files */
box-shadow:0 1px 3px rgba(0,0,0,.12)        /* outer board frame, not design — SET only */
```
The three `rgba(0,0,0,…)` shadows belong to the file viewer's own loader/iframe chrome and
must not be read as design values. The `rgba(15,23,42,0.25)` thumb shadow is the only real
neutral design shadow, and it is on a control, not a surface.

**Cards have no shadow at all.** Of the 82 `section.c` cards in the corpus, **66 declare
`border: 1px solid …` and 0 declare a `box-shadow`** — the 16 without a border are the dark
inverted tiles and the tinted/accent-soft tiles, which read as surfaces by fill instead.
Confirmed by scan: no card tag in either file contains both `border-radius: 24px` and
`box-shadow`.

**Not present in the design markup:** `text-shadow` (0), `drop-shadow` filter (0), an
`inset` shadow (0 — `inset` appears exactly once in each raw file, as
`#__bundler_thumbnail { position: fixed; inset: 0; }`, which is the file viewer's own
chrome and not a shadow), `outline` (0), any `:focus` rule (0).

---

## 3. SPACING

### 3a. The card gap (gutter)

```css
/* The bento grid — 16px gutter, 12 columns. Every page in both files. */
<div class="bento" style="display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 16px">
```
Source: **PD** and **SET** (12 pages in SET, identical string; PD uses the same grid
declaration). This is the single most consistent value in the corpus.

The theme-token sheet's own outer grid uses a looser 20px:

```css
<div style="display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); gap: 20px">
```
Source: **SET** `RSI_Dashboard_Theme_Tokens.html`. Reference sheet only.

Gap values in use across the corpus, with counts (deduplicated file set — 17 markup
files, so repeated components are not double-counted): `2px` (32), `3px` (8), `4px` (34),
`6px` (55), `8px` (66), `10px` (90), `12px` (48), `14px` (34), `16px` (38), `18px` (6),
`20px` (35), `24px` (1), `32px` (1). Two scales coexist: a dense 2/4/6/8/10/12 inside
cards, and 14/16/20 between cards and page regions. **No gap value outside this list
exists**, so any theme spacing scale must come from it rather than a 4/8/16 ladder alone.

### 3b. Page padding — window edge to first card

```css
/* PD: 16px from the window edge. The app chrome row above it is 44px tall. */
<div style="flex: 1; display: flex; flex-wrap: wrap; gap: 16px; padding: 0 16px 16px; align-items: flex-start">
```
Source: **PD**, the row that holds the sidebar and `<main>`.

```css
/* PD: inside that row, <main> adds its own 24px left/top and 32px bottom. */
<main style="flex: 999 1 560px; min-width: 0; min-height: 920px; box-sizing: border-box; background: var(--surface); border: 1px solid var(--border); border-radius: 24px; padding: 24px 24px 32px">
```
Source: **PD**. So the real edge-to-content distance on the plugin-detail page is
**16px (page) + 24px (main) = 40px** before the first card.

```css
/* PD: the card stack inside main is 20px apart, not 16px. */
<div style="max-width: 980px; margin: 0 auto; display: flex; flex-direction: column; gap: 20px">
```
Source: **PD**. The 980px cap is PD's main content width. It is not the only cap in the
corpus — body-copy `max-width` values are `620px` (5×, page subtitles), `820px` (PD hero
paragraph), `760px` (tokens-sheet intro), `640px` (admin helper text), `256px` (sidebar
column). **980px is the only cap applied to a whole card stack.**

```css
/* SET: chart pages use 20px page padding and a 20px stack, no white main panel. */
<div style="{{vars}}; font-family: Inter, system-ui, sans-serif; color: var(--ink); background: var(--bg); min-height: 100vh; box-sizing: border-box; padding: 20px; display: flex; flex-wrap: wrap; gap: 20px; align-items: flex-start">
```
Source: **SET**, 12 pages, identical. Edge-to-card distance: **20px**, and there is no
second inset because the cards sit directly on `--bg` rather than inside a white `<main>`.

The reference sheet alone uses 56px:

```css
<div style="width: 1440px; min-height: 1400px; box-sizing: border-box; padding: 56px; background: #F6F7F9; font-family: Inter, system-ui, sans-serif; color: #0F172A; display: flex; flex-direction: column; gap: 32px">
```
Source: **SET** `RSI_Dashboard_Theme_Tokens.html`. Do not adopt — this is a presentation
board (`width: 1440px` fixed, `background: #F6F7F9` which is not even a theme token).

### 3c. Padding inside a card

**20px, with `border-radius: 24px`, on 68 cards.** This is the card interior standard and
it is not negotiable from this corpus.

```css
/* The standard card: 20px padding, 24px radius, 1px border, no shadow, 14px internal gap */
<section class="c" style="grid-column: span 12; background: var(--surface); border: 1px solid var(--border); border-radius: 24px; padding: 20px; display: flex; flex-direction: column; gap: 14px">
```
Source: **PD** (Components, Source) and **SET** (68 occurrences of `section.c` with this
exact padding/radius pair).

```css
/* The one exception: a card that WRAPS a nested panel uses 8px padding and the nested
   panel carries the real 20px. 14 occurrences, all on media/chart cells. */
<section class="c" style="grid-column: span 7; grid-row: span 2; background: var(--surface); border: 1px solid var(--border); border-radius: 24px; padding: 8px; display: flex; flex-direction: column">
  <div style="background: var(--panel); border-radius: 18px; padding: 20px; display: flex; flex-direction: column; gap: 14px; flex: 1">
```
Source: **SET** `RSI_Paid_Marketing.html`; the same 8px-over-20px nesting appears in **PD**'s
hero: outer `padding: 8px` / `border-radius: 24px`, inner `padding: 20px` / `border-radius: 18px`.
**This 8px-outer + 20px-inner + radius 24-outer/18-inner pair is the canonical nested-panel
move in both files.**

Other radii in use (declaration counts over the 17-file corpus): 999px (146), 24px (100),
10px (66), 12px (46), 50% (39), 14px (38), 18px (26), 8px (17), `12px 0 0 12px` (10),
`0 12px 12px 0` (10), 3px (10), 9px (9), 16px (8), 6px (5), 11px (3), 20px (3),
`5px 5px 2px 2px` (3), 7px (2). **Nine steps between 3px and 24px plus 999px — there is
no single radius scale here, and no radius token.**

Sidebar padding differs from card padding — it is an edge-to-edge column, not a card:

```css
/* PD sidebar */
<aside style="{{vars}}; font-family: Inter, system-ui, sans-serif; color: var(--ink); width: 100%; height: 920px; box-sizing: border-box; background: var(--surface); border: 1px solid var(--border); border-radius: 24px; padding: 16px 12px; display: flex; flex-direction: column; gap: 14px">
```
Source: **PD** bundled `HarnessSidebar` (16px vertical, 12px horizontal, 14px gap).

```css
/* SET sidebar — wider */
<aside class="side" style="{{vars}}; font-family: Inter, system-ui, sans-serif; color: var(--ink); width: 100%; background: var(--surface); border: 1px solid var(--border); border-radius: 24px; padding: 20px 14px; box-sizing: border-box; display: flex; flex-direction: column; gap: 20px">
```
Source: **SET** `RSI_Sidebar.html`.

---

## 4. DARK TILES

Six distinct dark-surface shapes exist. Five of them are `background: var(--ink)` with
`color: #FFFFFF` — **never a separate `--dark` token**. In blue theme that resolves to
`#0F172A`; in orange to `#1C1917`. The sixth is the tokens sheet's own panel, which is the
one place a dark surface is written as a literal hex with a different text colour:
`background: #0F172A; color: #E2E8F0`. **No dark surface carries a shadow or a border.**

### 4a. The metric tile (the "dark usage/metric tile")

```css
/* PD: the update tile. Span 5 in a 12-col grid. */
<section class="c" style="grid-column: span 5; background: var(--ink); color: #FFFFFF; border-radius: 24px; padding: 20px; display: flex; flex-direction: column; justify-content: space-between; gap: 14px">
```
Source: **PD**, "Update" tile. Its contents, in order:

```css
<h2 style="margin: 0; font-size: 15px; font-weight: 600; color: var(--ink-on-dark)">Update</h2>
<span class="num" style="font-size: 40px; font-weight: 700; letter-spacing: -0.03em; line-height: 1">v0.1.0</span>
<button type="button" sc-camel-on-click="{{check}}" style="min-height: 40px; padding: 0 16px; border: 0; border-radius: 12px; background: #FFFFFF; color: var(--ink); font: inherit; font-size: 13px; font-weight: 600; cursor: pointer">Check for updates</button>
<span role="status" style="font-size: 12px; color: var(--ink-on-dark)">{{checkMsg}}</span>
```

The pattern to note: **label at 15px/600 `--ink-on-dark` → value at 40px/700 white →
action button inverted to white fill / `--ink` text → status line 12px `--ink-on-dark`.**
The tile is inverted throughout, including the button.

```css
/* SET: the same tile at 3-col and 2-col width. Identical except the gap. */
<section class="c" style="grid-column: span 3; background: var(--ink); color: #FFFFFF; border-radius: 24px; padding: 20px; display: flex; flex-direction: column; justify-content: space-between; gap: 10px">
<section class="c" style="grid-column: span 2; background: var(--ink); color: #FFFFFF; border-radius: 24px; padding: 20px; display: flex; flex-direction: column; justify-content: space-between; gap: 10px">
```
Source: **SET** `RSI_Admin_Settings.html` ("People with access", 44px value),
`RSI_Data_Checks.html`, `RSI_Closer_Performance.html`, `RSI_Payments.html`,
`RSI_Whole_Team.html`, `RSI_Paid_Marketing.html`.

### 4b. The sidebar usage tile — `--ink`, radius 18px, padding 14px

```css
<section style="background: var(--ink); color: #FFFFFF; border-radius: 18px; padding: 14px; display: flex; flex-direction: column; gap: 10px">
```
Source: **PD** bundled `HarnessSidebar`. Contents:

```css
<span style="font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; color: var(--ink-on-dark)">Today</span>
<span class="num" style="font-size: 12px; color: var(--ink-on-dark)">$0</span>
<span class="num" style="font-size: 26px; font-weight: 700; letter-spacing: -0.02em; line-height: 1">518M <span style="font-size: 13px; font-weight: 500; color: var(--ink-on-dark)">tokens</span></span>
<div style="height: 6px; border-radius: 999px; background: rgba(255,255,255,0.14)">
  <div style="width: 18%; height: 100%; border-radius: 999px; background: var(--accent)"></div>
</div>
<div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.12); font-size: 12px; color: var(--ink-on-dark)">
```

Note this tile is **18px radius, not 24px**, and **14px padding, not 20px** — because it
sits inside the sidebar, not on the page grid. Its progress bar rides the **accent** on
dark, and its dividers are `rgba(255,255,255,0.12)` / track `rgba(255,255,255,0.14)`.

### 4c. The meta pill on dark

```css
<span style="align-self: flex-start; font-size: 12px; font-weight: 600; color: #FFFFFF; background: var(--ink); border-radius: 999px; padding: 4px 10px">MQD</span>
```
Source: **SET** `RSI_Paid_Marketing.html`. Inverted pill: dark fill, white text — used to
mark a series on a light card.

### 4d. Chart bar on dark

```css
<div style="width: 100%; height: 10%; background: var(--ink); border-radius: 12px">
```
Source: **SET** `RSI_Paid_Marketing.html`. `--ink` doubles as the darkest data-series
colour, which is why the tokens sheet lists it as `'ink', 'Main text, dark tiles, active
segment'`.

### 4e. Not a token

There is **no** `--dark`, `--dark-surface`, `--ink-dark` or inverted-mode token anywhere.
The dark tile is literally `background: var(--ink)`. Confirmed against the complete custom
property list in §10.

---

## 5. PILLS

`border-radius: 999px` appears **146 times** across the corpus, with **ten distinct
padding values**: `5px 10px` (32), `4px 10px` (26), `4px 9px` (15), `3px 8px` (8),
`2px 8px` (7), `3px 9px` (6), `2px 7px` (5), `6px 12px` (2), `3px 10px` (1),
`5px 11px` (1). Eight role-mapped combinations are documented below; **only one of them
carries a shadow.**

### 5a. The accent-outline pill (the badge that glows) — the strongest find

```css
/* 12px / 600, accent-ink on surface, accent-line 1px border, 5px 10px padding, glow */
<span class="num" style="font-size: 12px; font-weight: 600; color: var(--accent-ink); background: var(--surface); border: 1px solid var(--accent-line); border-radius: 999px; padding: 5px 10px; box-shadow: 0 6px 16px var(--glow)">35.8% of registered attended</span>
```
Source: **SET** (8 pages) — see §2b. **The only pill in the corpus with a shadow.**

```css
/* The same pill without the shadow — its plain partner. Same 5px 10px. */
<span class="num" style="font-size: 12px; font-weight: 600; color: var(--ink-2); background: var(--surface); border: 1px solid var(--border); border-radius: 999px; padding: 5px 10px">Daily ad spend · both Meta accounts</span>
```
Source: **SET** `RSI_Paid_Marketing.html`. Measured pairing: 8 pages carry the accent+glow
badge and 7 carry the plain `--border` version at the same `5px 10px` — `RSI_Funnels.html`
has the glowing badge but not the plain partner. So "pills come in pairs" is the common
case, not a rule: 7 of 12 pages show both.

### 5b. The page kicker pill

```css
/* 12px / 600, accent-ink on surface, accent-line border, 4px 10px */
<span style="display: inline-flex; align-self: flex-start; font-size: 12px; font-weight: 600; color: var(--accent-ink); background: var(--surface); border: 1px solid var(--accent-line); border-radius: 999px; padding: 4px 10px">Marketing</span>
```
Source: **SET**, under every page h1. Padding is 4px 10px, not 5px 10px — the kicker is
slightly tighter than the badge.

### 5c. The status / state pill (the "mode indicator" analogue)

```css
/* 12px / 600 with a 7px dot. Colours come from renderVals, not from CSS. */
<span style="display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: {{stFg}}; background: {{stBg}}; border-radius: 999px; padding: 3px 10px">
  <span style="width: 7px; height: 7px; border-radius: 50%; background: {{stDot}}"></span>{{stLabel}}
</span>
```
Source: **PD**, twice (hero and component row). Its values in `renderVals()`:

```js
stLabel: on ? 'Running' : 'Stopped',
stFg:    on ? '#127A45' : 'var(--ink-2)',
stBg:    on ? '#E7F6EE' : 'var(--panel)',
stDot:   on ? '#16A34A' : 'var(--muted)',
```

```css
/* SET equivalent, 4px 10px padding instead of 3px 10px */
<span style="display: inline-flex; align-items: center; gap: 6px; font-size: 12px; font-weight: 600; color: #127A45; background: #E7F6EE; border-radius: 999px; padding: 4px 10px">
```
Source: **SET** `RSI_Data_Checks.html`, `RSI_Admin_Settings.html`. Fixed status colours:
`#127A45` text on `#E7F6EE`, dot `#16A34A`. These are the `fixed` tokens the theme sheet
says "stay fixed in both" themes.

### 5d. The mono / tag chip

```css
/* 11px mono, no weight, border, 2px 8px — the tightest pill in the corpus */
<span class="mono" style="font-size: 11px; color: var(--ink-2); background: var(--surface); border: 1px solid var(--border); border-radius: 999px; padding: 2px 8px">ui-bento-theme</span>
```
Source: **PD**, component row (the `dsh-bento-theme` / `ui-bento-theme` tags).

```css
/* 11px / 600, accent-soft fill, no border, 2px 8px */
<span style="font-size: 11px; font-weight: 600; color: var(--accent-ink); background: var(--accent-soft); border-radius: 999px; padding: 2px 8px">link</span>
```
Source: **PD**, Source card.

### 5e. The back-link pill

```css
/* 13px / 500, panel fill, no border, 32px min-height, asymmetric padding 0 12px 0 8px */
<a href="HarnessPlugins.dc.html" style="align-self: flex-start; min-height: 32px; display: inline-flex; align-items: center; gap: 6px; padding: 0 12px 0 8px; border-radius: 999px; background: var(--panel); color: var(--ink-2); font-size: 13px; font-weight: 500; text-decoration: none">
```
Source: **PD**. Asymmetric padding is deliberate — the 8px side holds a 14px chevron.

### 5f. Pill padding reference

| Pill role | radius | padding | size | weight | fill | border | shadow |
|---|---|---|---|---|---|---|---|
| badge + glow | 999px | 5px 10px | 12px | 600 | `--surface` | 1px `--accent-line` | `0 6px 16px var(--glow)` |
| badge plain | 999px | 5px 10px | 12px | 600 | `--surface` | 1px `--border` | none |
| page kicker | 999px | 4px 10px | 12px | 600 | `--surface` | 1px `--accent-line` | none |
| status (PD) | 999px | 3px 10px | 12px | 600 | `#E7F6EE`/`--panel` | none | none |
| status (SET) | 999px | 4px 10px | 12px | 600 | `#E7F6EE` | none | none |
| mono tag | 999px | 2px 8px | 11px | 400 | `--surface` | 1px `--border` | none |
| soft tag | 999px | 2px 8px | 11px | 600 | `--accent-soft` | none | none |
| back link | 999px | 0 12px 0 8px | 13px | 500 | `--panel` | none | none |

**Pills carry no `text-transform`** anywhere. Their labels are sentence case or typed caps.

---

## 6. SEGMENTED CONTROL

### 6a. In PD — not present in this file

PD contains **no** segmented control and no two-way tab control.

```
[regex]::Matches($pd,'role="group"')      → 0
[regex]::Matches($pd,'aria-pressed')      → 0
[regex]::Matches($pd,'role="tab"')        → 0
[regex]::Matches($pd,'role="tablist"')    → 0
[regex]::Matches($pd,'aria-selected')     → 0
```

What PD does have is two independent **switches** (§8), which are toggles, not segments.
If the plugin-detail page needs a segmented control, PD gives no measured precedent.

### 6b. In SET — the segmented control, the same pattern over 13 groups

There are 24 `role="group"` containers in SET: **13 are segmented controls** (2–3 text
buttons with `aria-pressed`) and **11 are the two-swatch theme picker** (the same shell,
but its children are colour dots rather than labels). Only the 13 segmented ones are
described here.

```css
/* The container. NOTE: background --surface on a --surface card, so it reads by its border alone. */
<div role="group" aria-label="View" style="display: flex; background: var(--surface); border: 1px solid var(--border); border-radius: 14px; padding: 4px">
```
Source: **SET** `RSI_Paid_Marketing.html` ("View": Monthly / Weekly / Range).

```css
/* Selected segment: dark fill, white text, 600, radius 10px, NO shadow, NO border */
<button type="button" aria-pressed="true" style="min-height: 36px; padding: 0 14px; border: 0; border-radius: 10px; background: var(--ink); color: #FFFFFF; font: inherit; font-size: 13px; font-weight: 600">Monthly</button>
```

```css
/* Unselected segment: transparent, ink-2, no weight declaration (inherits 400) */
<button type="button" aria-pressed="false" style="min-height: 36px; padding: 0 14px; border: 0; border-radius: 10px; background: transparent; color: var(--ink-2); font: inherit; font-size: 13px">Weekly</button>
```

**Critical measured fact: the selected segment is `--ink`, not the accent.** The only
accent-filled segment in the corpus is the currency toggle, which is a different treatment:

```css
/* The accent variant: accent-soft fill, accent-ink text, still no shadow and no border */
<button type="button" aria-pressed="true" style="min-height: 36px; padding: 0 12px; border: 0; border-radius: 10px; background: var(--accent-soft); color: var(--accent-ink); font: inherit; font-size: 13px; font-weight: 600">A$</button>
```
Source: **SET** `RSI_Paid_Marketing.html`, `RSI_Payments.html`, `RSI_Admin_Settings.html`.

**There is no shadow on any segment, selected or not** — verified: every
`role="group"` block in SET was checked for `box-shadow` and all returned false. A
"selected segment with a shadow" does not exist in either file.

Container variants measured, complete list:

| Container | radius | padding | border | gap |
|---|---|---|---|---|
| View / Scope / Market / Window / Path / Source (chart pages) | 14px | 4px | 1px `--border` | none declared |
| Currency | 14px | 4px | 1px `--border` | none declared |
| Theme (two swatches) | 14px | 4px | 1px `--border` | `gap: 4px` |
| Role for new user (Admin Settings) | 12px | 3px | 1px `--control` | none |
| Role per user row (Admin Settings) | 12px | 3px | none | none |

Segment geometry: `min-height: 36px` (34px in the user rows), `border-radius: 10px`
(9px at 12px/34px), `padding: 0 12px` or `0 14px`, `border: 0`, `font-size: 13px`
(12px in the user rows).

### 6c. The specific controls named in the brief — not present in either file

```
Chat           → 0 in PD, 0 in SET
Trajectory     → 0 in PD, 0 in SET
Installed      → 0 in PD, 0 in SET
"Discover"     → 2 hits in SET, both inside the phrase "Discovery calls" (a KPI tile
                 heading in RSI_Paid_Marketing), NOT a tab label
```

So a **Chat / Trajectory** or **Installed / Discover** tab control has **no precedent in
either reference file**. The nearest measured analogue is the two-button
`role="group"` container above — same radius, padding and weights, but its selected state
is `--ink`, not accent, and it has no shadow.

---

## 7. 2×2 TILES

### 7a. What exists

There is **one** true 2×2 grid in the corpus, in the Projection page:

```css
/* The 2×2 container: span 5, two equal columns, 16px gap — the card gutter, not a tighter one */
<div class="c" style="grid-column: span 5; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px">
```
Source: **SET** `RSI_Projection.html`.

Its cells (2 tiles + 1 spanning cell, so the grid is 2×2 in shape, not four equal cells):

```css
<!-- dark tile -->
<section style="background: var(--ink); color: #FFFFFF; border-radius: 24px; padding: 20px; display: flex; flex-direction: column; justify-content: space-between; gap: 10px">
<!-- light tile -->
<section style="background: var(--surface); border: 1px solid var(--border); border-radius: 24px; padding: 20px; display: flex; flex-direction: column; justify-content: space-between; gap: 10px">
<!-- spanning accent tile -->
<section style="grid-column: 1 / -1; background: var(--accent-soft); border: 1px solid var(--accent-line); border-radius: 24px; padding: 20px; display: flex; flex-direction: column; gap: 6px">
```
Source: **SET** `RSI_Projection.html`.

### 7b. The tile aspect / min-height — not present in this file

**There is no aspect ratio and no min-height on any tile, in either file.**

```
aspect-ratio in PD → 0 occurrences
aspect-ratio in SET (all 14 pages + imports) → 0 occurrences
2-column grids in SET whose tag also declares min-height → 0 of 6
```

Tile height is entirely driven by content: label + value + sub-value inside a
`display: flex; flex-direction: column; justify-content: space-between` box. The
`justify-content: space-between` is what makes two tiles in one row equal height — not a
declared height.

**All 110 `min-height` declarations in the corpus are on controls, rows or page roots —
never on a tile.** Complete value list with counts: `36px` (32, segments), `40px` (22,
buttons/inputs), `38px` (18, filter pills), `100vh` (13, page root), `46px` (11, date
button), `44px` (5, primary CTA), `32px` (4, buttons/pills), `34px` (2, compact segments),
`920px` (1, PD sidebar), `1400px` (1, tokens reference sheet), `0` (1). **No tile carries
one**, which is why two tiles in a row are equal height only through
`justify-content: space-between` and shared content shape.

### 7c. The other 2-column grids (none are square tiles)

| Page | Container | gap | Cell |
|---|---|---|---|
| `RSI_Failed_Payments` | `repeat(2, minmax(0, 1fr))` | `10px` | `background: var(--panel); border-radius: 16px; padding: 14px; display: flex; flex-direction: column; gap: 4px` |
| `RSI_Paid_Marketing` (MQD vs SQD) | `repeat(2, minmax(0, 1fr))` | `10px` | `background: var(--panel); border-radius: 18px; padding: 16px; display: flex; flex-direction: column; gap: 12px` |
| `RSI_Payments` (legend) | `repeat(2, minmax(0, 1fr))` | `6px 16px` | no surface, `font-size: 13px` |
| `RSI_Dashboard_Theme_Tokens` | `repeat(2, minmax(0, 1fr))` | `20px` | reference board |

Source: **SET**, each named page. **The 2-column gap is 10px inside a card, 16px between
cards.** The 10px is the tighter of the two and is what a stat-tile grid should use.

### 7d. There is no 4-tile grid

A "four plugin tiles" 2×2 does not exist in either file. PD lays its content out as
`span 12` (hero), `span 12` (components), `span 7` (source), `span 5` (dark update) —
a 12/12/7/5 bento, not a 2×2. SET's stat rows are `span 3` ×4 (a 1×4 row) or `span 2` ×N
(a 1×N row). Neither is a 2×2.

---

## 8. SWITCHES

Switches exist in **both** files, with identical values. This is one of the few components
the two files agree on exactly.

### 8a. Track and thumb

```css
/* PD: the big switch, 52×30, 3px inset, 24px thumb */
<button type="button" role="switch" aria-checked="{{onStr}}" aria-label="Enable Bento Layout" sc-camel-on-click="{{toggle}}" style="width: 52px; height: 30px; border-radius: 999px; border: 0; padding: 3px; background: {{track}}; display: flex; justify-content: {{side}}; cursor: pointer"><span style="width: 24px; height: 24px; border-radius: 50%; background: #FFFFFF; box-shadow: 0 1px 3px rgba(15,23,42,0.25)"></span></button>

/* PD: the small switch, 46×28, 3px inset, 22px thumb — identical otherwise */
<button type="button" role="switch" aria-checked="{{onStr}}" aria-label="Enable Bento Layout component" sc-camel-on-click="{{toggle}}" style="width: 46px; height: 28px; border-radius: 999px; border: 0; padding: 3px; background: {{track}}; display: flex; justify-content: {{side}}; cursor: pointer"><span style="width: 22px; height: 22px; border-radius: 50%; background: #FFFFFF; box-shadow: 0 1px 3px rgba(15,23,42,0.25)"></span></button>
```
Source: **PD**, hero and component row.

```css
/* SET: the same 52×30 switch in Admin Settings, plus a disabled opacity */
<button type="button" role="switch" aria-checked="{{p.m.on}}" aria-label="{{p.label}} for Manager" disabled="{{p.m.disabled}}" sc-camel-on-click="{{p.m.toggle}}" style="width: 52px; height: 30px; border-radius: 999px; border: 0; padding: 3px; background: {{p.m.track}}; opacity: {{p.m.op}}; display: flex; justify-content: {{p.m.side}}; cursor: pointer"><span style="width: 24px; height: 24px; border-radius: 50%; background: #FFFFFF; box-shadow: 0 1px 3px rgba(15,23,42,0.25)"></span></button>
```
Source: **SET** `RSI_Admin_Settings.html`.

### 8b. The on-state track — yes, it uses the accent

Both files define the track from the same two tokens, and **the on-state is
`var(--accent)`, the off-state is `var(--control)`**:

```js
track: on ? 'var(--accent)' : 'var(--control)',
side:  on ? 'flex-end' : 'flex-start',
```

Source: **PD** `renderVals()`; **SET** `RSI_Admin_Settings.html` `renderVals()` — verbatim
identical. Plus the disabled state:

```js
op: blocked ? '0.4' : '1'
```
Source: **SET** `RSI_Admin_Settings.html`.

Resolved: on = `#2F6BEB` (blue) / `#E2600F` (orange); off = `#D5DCE7` (blue) /
`#DDD6CF` (orange). Off-state is a neutral control grey, **not** a low-opacity accent.

### 8c. Summary

| Property | Value |
|---|---|
| track size | 52×30 (primary), 46×28 (compact), both `border-radius: 999px`, `border: 0` |
| track padding | `3px` (= 24px thumb in a 30px track; 22px thumb in a 28px track) |
| track on | `var(--accent)` → `#2F6BEB` / `#E2600F` |
| track off | `var(--control)` → `#D5DCE7` / `#DDD6CF` |
| thumb | `#FFFFFF`, `border-radius: 50%`, `box-shadow: 0 1px 3px rgba(15,23,42,0.25)` |
| disabled | `opacity: 0.4` on the whole control |
| transition | **none declared** — no `transition` in the design markup, so the switch snaps |

---

## 9. COMPOSER

**Not present in this file. Neither file contains a composer, message input, textarea, or
any text-entry surface that could be read as one.**

PD, exhaustive (raw byte scan of the 521,196-byte file **and** the decoded markup — both
return zero):

```
'composer' / 'Composer'   → 0
'<textarea'               → 0
'<input'                  → 0
'<form'                   → 0
'contenteditable'         → 0
'role="textbox"'          → 0
'Chat' / 'Trajectory'     → 0
'Prompt' / 'prompt'       → 0
```

SET, same double scan over the 5,409,827-byte file and all 14 decoded page bundles:

```
'composer' / 'Composer'   → 0
'<textarea'               → 0
'contenteditable'         → 0
'role="textbox"'          → 0
'Chat'                    → 0
```

(The raw-file `<input` count is 0 in both because the markup is escaped inside the bundler
template string; the decoded counts are 0 for PD and 5 for SET, listed below.)

SET contains exactly **5 `<input>` elements in total** across all 14 page bundles — 2 that
accept text and 3 range sliders. There is no textarea and no rich-text surface. This is the
complete inventory:

```css
/* 1 — email field, Admin Settings. border uses the NEUTRAL --control token, no shadow. */
<input id="ad-email" type="email" placeholder="name@remotesalesinstitute.com" value="{{draftEmail}}" sc-camel-on-change="{{setEmail}}" style="min-height: 44px; box-sizing: border-box; padding: 0 14px; border-radius: 12px; border: 1px solid var(--control); background: var(--surface); font: inherit; font-size: 14px; color: var(--ink)">
```
```css
/* 2 — search field, Failed Payments. Same neutral border, no shadow. */
<input id="pf-search" type="search" placeholder="Name or program" style="min-height: 40px; width: 220px; box-sizing: border-box; padding: 0 12px; border-radius: 12px; border: 1px solid var(--control); background: var(--surface); font: inherit; font-size: 13px; color: var(--ink)">
```
```css
/* 3–5 — three range sliders, Projection. Styled by one rule. */
input[type=range]{accent-color:var(--accent);width:100%}
```
Source: **SET** `RSI_Admin_Settings.html`, `RSI_Failed_Payments.html`,
`RSI_Projection.html`.

### What this means for the claim

The claim under review — *"the reference gives the composer the accent border and the
accent glow"* — **is not supported by either file.** Neither file contains a composer, so
neither file can specify one. There is no composer border to quote and no composer shadow
to quote.

The nearest thing that could have been mistaken for it, and why the distinction matters:

- The accent-border + accent-glow **pairing does exist** — §2b, 10 elements — but every
  one of them is a **12px pill badge or a 60×60 icon tile**, i.e. a floating read-only
  label. The reference's own annotation calls the shadow `'Floating badge shadow'`
  (`RSI Dashboard Theme Tokens`, `['glow', 'Floating badge shadow', …]`).
- The corpus's actual **text-entry** treatment is the opposite of accent-bordered: both
  SET inputs use `border: 1px solid var(--control)` — the neutral border token — with
  `border-radius: 12px` and **no box-shadow at all**.
- The theme repo already records this absence independently, and it agrees with the
  measurement: `src/47-feature-center.js` carries the comment *"NOTE ON PROVENANCE: the
  reference is a dashboard and contains no composer, so it does [not]…"*.

So: an accent border plus accent glow on the composer is a **new design decision**, not a
reference value. It can still be the right decision — the glow token and the
accent-line token are both real and measured — but it cannot be justified as "the
reference does it". If the decision is kept, it should be recorded with its real
provenance.

---

## 10. ACCENT-TINTED SHADOW CUSTOM PROPERTIES

There is **exactly one** accent-tinted shadow custom property in either file: `--glow`.
There is no `--shadow-*`, no `--ring-*`, no `--focus-*`, no `--elevation-*`, no
`--accent-glow`, no `--*-shadow` of any kind.

```
[regex]::Matches($pd, '--shadow')      → 0
[regex]::Matches($pd, '--ring')        → 0
[regex]::Matches($pd, '--focus')       → 0
[regex]::Matches($pd, '--elevation')   → 0
[regex]::Matches($set, '--shadow')     → 0
[regex]::Matches($set, '--ring')       → 0
[regex]::Matches($set, '--focus')      → 0
[regex]::Matches($set, '--elevation')  → 0
[regex]::Matches($pd,  'glow\s*:')     → 2 definitions (blue + orange), 1 usage
[regex]::Matches($set, 'glow\s*:')     → 2 definitions per theme-aware page bundle,
                                          1 usage on each of 9 chart pages
```

The distinction matters: the token is **defined in 13 decoded files and used in 10**. Its
definition is one JS key per theme; its usage is one shadow declaration per page that needs
one.

Measured usage: `var(--glow)` appears **10 times** in the decoded corpus — once in PD
(the hero icon) and once on each of 9 SET chart pages. `Admin_Settings`, `Sidebar`,
`Data_Checks`, the tokens sheet and both sidebar components use `glow` only as a defined
token, never as a usage.

### 10a. The definition

The token is **not written in CSS**. It is a JS object key, and the whole object is
serialised onto the page root as a `style` string — so the declaration that eventually
lands in the DOM is `--glow: rgba(47,107,235,0.12);`.

```js
glow:'rgba(47,107,235,0.12)'     /* blue */
glow:'rgba(234,106,31,0.14)'     /* orange */
```

Source: **PD** `renderVals()` `THEMES` object; **SET** same object in 13 page bundles.
Serialisation, verbatim:

```js
const vars = Object.keys(t).map(k => '--' + k + ':' + t[k]).join(';');
```
Source: **PD** and **SET**. The root element then carries `style="{{vars}}; font-family:
Inter, …"`, i.e. the DOM sees:

```css
--bg:#EDF0F4; --surface:#FFFFFF; --panel:#F3F6FC; --border:#E3E7EE; --divider:#EEF1F5;
--control:#D5DCE7; --ink:#0F172A; --ink-2:#334155; --muted:#5B6474;
--ink-on-dark:#CBD5E1; --accent:#2F6BEB; --accent-fill:#2F6BEB; --accent-ink:#1E4FBF;
--accent-soft:#E8EFFE; --accent-line:#DCE5FB; --link:#2F6BEB; --link-hover:#1E4FBF;
--data-2:#6E97F2; --data-3:#A9C1F7; --data-4:#CFDCFB; --partial:#F2C9A6; --rule:#C9D3E4;
--glow:rgba(47,107,235,0.12); --warn-ink:#B4540F; --warn-bg:#FDF1E7;
```

### 10b. The resolved values

| Token | Blue | Orange | Used as |
|---|---|---|---|
| `--glow` | `rgba(47, 107, 235, 0.12)` | `rgba(234, 106, 31, 0.14)` | `0 6px 16px var(--glow)` (9×) and `0 10px 24px var(--glow)` (1×) |

Note the orange glow is **more opaque** (0.14 vs 0.12), because orange on white has less
apparent luminance than blue at the same alpha. If a theme adopts one glow alpha for both
accents it will be visibly weaker in the orange theme.

### 10c. Complete custom-property inventory (both files, deduplicated)

The theme defines 25 properties and nothing else — this is the full list, so anything not
named here does not exist in the reference:

`--bg`, `--surface`, `--panel`, `--border`, `--divider`, `--control`, `--ink`, `--ink-2`,
`--muted`, `--ink-on-dark`, `--accent`, `--accent-fill`, `--accent-ink`, `--accent-soft`,
`--accent-line`, `--link`, `--link-hover`, `--data-2`, `--data-3`, `--data-4`, `--partial`,
`--rule`, `--glow`, `--warn-ink`, `--warn-bg`.

Usage counts across the corpus (as `var(--x)`, over the deduplicated 17-file set):
`--surface` 154, `--muted` 139, `--ink-2` 120, `--ink` 119, `--border` 112, `--panel` 103,
`--accent-soft` 55, `--accent-ink` 53, `--accent` 35, `--accent-line` 32,
`--ink-on-dark` 29, `--data-3` 22, `--divider` 16, `--data-2` 15, `--warn-ink` 15,
`--warn-bg` 13, `--bg` 12, `--control` 12, `--link` 12, `--link-hover` 12, `--glow` 10,
`--accent-fill` 9, `--data-4` 8, `--rule` 3, `--partial` 2.

**There is no `--radius-*`, no `--space-*`, no `--font-*`, no `--text-*`, no `--shadow-*`
token.** Geometry (radii, spacing, type sizes) is hard-coded as literals in every inline
style, which is why the counts in §1 and §3 are the only way to recover it.

---

## 11. Values a theme could adopt directly

Only values quoted above, with the source that carries them. "Both" = identical in PD
and SET.

| Token | Value | Source |
|---|---|---|
| card gutter (bento) | `gap: 16px`, `grid-template-columns: repeat(12, minmax(0, 1fr))` | both |
| inner 2-col gutter | `gap: 10px` | SET |
| page padding → card (SET chart pages) | `20px` | SET |
| page padding (PD shell) | `16px` page row + `24px` main = `40px` to first card | PD |
| card stack gap (PD) | `20px` | PD |
| card padding | `20px` | both |
| nested-panel card | outer `padding: 8px` / `radius 24px` + inner `padding: 20px` / `radius 18px` | both |
| card radius | `24px` | both |
| nested panel radius | `18px` | both |
| card shadow | `none` — 66 of 82 `section.c` cards declare `border: 1px solid …`, 0 declare a shadow | both |
| page h1 | `32px / 700 / -0.025em / line-height 1.15` | SET |
| plugin-detail h1 | `26px / 700 / -0.025em / no line-height` | PD |
| h2 large card | `17px / 600 / no tracking / no line-height` | both |
| h2 small + dark card | `15px / 600` | both |
| eyebrow label | `11px / 600 / +0.06em / uppercase / var(--muted)` | SET, PD-sidebar |
| table-header label | `12px / 600 / +0.05em / uppercase` | SET |
| badge caps | `10px / 700 / +0.08em` | PD-sidebar |
| body (page subtitle) | `14px`, `var(--muted)` | SET |
| body (detail paragraph) | `15px / line-height 1.6 / var(--ink-2)` | PD |
| body (card dense) | `13px / line-height 1.5` | PD, SET |
| caption / meta | `12px / var(--muted)` | both |
| source line | `11px / var(--muted)` | SET |
| button primary | `13px / 600`, `min-height 40px`, `radius 12px` | both |
| button CTA | `14px / 600`, `min-height 44px`, `radius 14px`, `--accent-soft` fill, `--accent-line` border, `--accent-ink` text | PD-sidebar |
| KPI figure | `40px / 700 / -0.03em / line-height 1` | SET |
| KPI figure (largest) | `44px / 700 / -0.03em / line-height 1` | SET |
| KPI figure (mid) | `34px / 700 / -0.03em / line-height 1` | SET |
| KPI figure (small) | `28px / 700 / -0.02em / line-height 1` | SET |
| tile figure | `20px / 700 / no tracking` | SET |
| sub-metric | `16px / 600 / var(--ink)` | SET |
| numerals | `font-variant-numeric: tabular-nums` on `.num` | both |
| accent shadow | `0 6px 16px var(--glow)` | both |
| accent shadow (large) | `0 10px 24px var(--glow)` | SET |
| `--glow` blue | `rgba(47,107,235,0.12)` | both |
| `--glow` orange | `rgba(234,106,31,0.14)` | both |
| accent border + glow pairing | `border: 1px solid var(--accent-line)` + `box-shadow: 0 6px 16px var(--glow)` — **on pills and one 60px icon tile only** | both |
| neutral thumb shadow | `0 1px 3px rgba(15,23,42,0.25)` | both |
| pill radius | `999px` | both |
| pill padding (badge) | `5px 10px`, `12px / 600` | both |
| pill padding (kicker) | `4px 10px`, `12px / 600` | SET |
| pill padding (tag) | `2px 8px`, `11px` (mono) or `11px / 600` (accent-soft) | PD |
| status pill (on) | `#127A45` on `#E7F6EE`, dot `#16A34A` | both |
| dark tile | `background: var(--ink)`, `color: #FFFFFF`, `radius 24px`, `padding 20px` | both |
| dark tile label | `15px / 600 / var(--ink-on-dark)` | both |
| dark tile value | `40px / 700 / -0.03em / line-height 1` (white) | both |
| dark tile button | inverted: `background: #FFFFFF`, `color: var(--ink)`, `radius 12px`, `13px/600` | PD |
| dark sidebar tile | `var(--ink)`, `radius 18px`, `padding 14px` | PD-sidebar |
| divider on dark | `1px solid rgba(255,255,255,0.12)`; track `rgba(255,255,255,0.14)` | PD-sidebar |
| segment container | `radius 14px`, `padding 4px`, `border 1px solid var(--border)`, `background: var(--surface)` | SET |
| segment selected | `radius 10px`, `background: var(--ink)`, `color: #FFFFFF`, `13px / 600`, `min-height 36px`, `border: 0`, **no shadow** | SET |
| segment unselected | `background: transparent`, `color: var(--ink-2)`, `13px` (no weight) | SET |
| segment selected (accent variant) | `background: var(--accent-soft)`, `color: var(--accent-ink)`, `13px / 600` | SET |
| switch track (on) | `var(--accent)` | both |
| switch track (off) | `var(--control)` | both |
| switch size | `52×30` / `46×28`, `radius 999px`, `padding 3px`, `border: 0` | both |
| switch thumb | `#FFFFFF`, `border-radius: 50%`, `box-shadow: 0 1px 3px rgba(15,23,42,0.25)` | both |
| switch disabled | `opacity: 0.4` | SET |
| font stack | `Inter, system-ui, sans-serif` | both |
| mono stack | `'JetBrains Mono', ui-monospace, monospace` (on `.mono`) | PD |
| font weights in use | `400 / 500 / 600 / 700` only | both |
| content max-width | `980px` | PD |

### Values a theme must NOT adopt

| Value | Why |
|---|---|
| `padding: 56px` page root | tokens presentation board only (`width: 1440px` fixed) |
| `background: #F6F7F9` | same board; not a theme token |
| `font-size: 36px` h1 | tokens sheet only, and it declares no `font-weight` |
| `gap: 20px` bento | tokens sheet only; every product page uses 16px |
| `box-shadow: 0 1px 4px rgba(0,0,0,0.12)` and the other `rgba(0,0,0,…)` shadows | bundler/viewer chrome, not design |
| a "selected segment with a shadow" | does not exist — all segments are shadowless |
| an `aspect-ratio` or `min-height` on tiles | does not exist in either file |
| an accent-border + accent-glow **composer / input** | **does not exist — neither file has a composer** |

---

## 12. Gaps — what neither file answers

Each of these was searched for and returned zero hits in both files. They are open
questions, not values to guess.

| Question | Status |
|---|---|
| Composer / message input styling | **not present in either file** (§9) |
| Chat / Trajectory tab control | **not present in either file** (§6c) |
| Installed / Discover tab control | **not present in either file** (§6c) — the 2 `Discover` hits are the KPI heading "Discovery calls" |
| A two-way segmented control in PD | **not present in PD**; exists only in SET (§6a vs §6b) |
| `--shadow-*`, `--ring-*`, `--focus-*`, `--elevation-*` tokens | **not present in either file** (§10) |
| Focus-visible styling | **not present in either file** — no `outline`, no `:focus`, no focus token |
| Transition / animation on any control | **not present in the design markup** — no `transition`, `animation` or `@keyframes` in any of the 17 decoded files. (The bundled React runtime JS contains its own `transition` identifiers; those are library internals, not design CSS.) |
| Tile `aspect-ratio` or `min-height` | **not present in either file** (§7b) |
| A 2×2 grid of four equal square tiles | **not present** — the only 2-col grid holds 2 tiles + 1 spanning cell (§7a) |
| Text shadow / glow on type | **not present in either file** (§2c) |
| A dark-theme token set | **not present** — only blue and orange light themes; dark surfaces are `var(--ink)` (§4e) |
| Error / warn surface styling | **present but thin** — `--warn-ink` / `--warn-bg` are defined in every theme object and used **28 times** across 10 pages (mostly as inline `color: var(--warn-ink)` on a "below target" secondary value, or `background: var(--warn-bg)` on a tinted pill). No warn surface component, no icon, no warn border style exists. |
| A modal / dialog | **not present in either file** — `role="dialog"` 0, `<dialog` 0, `modal` 0 |
| An icon set / stroke width | not a CSS value — icons are inline SVG. Complete `stroke-width` list: `1.8` (28×, the standard at 18px nav size), `4` (8×, small chart dots/bars), `2` (7×, 14–16px chevrons/plus/close), `2.4` (1×). No icon sprite, no icon component, no shared size token. |
