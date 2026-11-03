# dsh-bento-theme

A DSH web-UI theme plugin that lays the shell out as bento cards, built one
feature at a time.

## What it is

The harness shell is a three-column grid: a session sidebar, a conversation
centre column and a right panel, all flush on one canvas. This plugin insets
each column onto its own rounded card, under a single document attribute, with
each card switchable on its own from Settings › Bento layout.

It is a **theme plugin**, not a page: it ships no panel, no route and no tool. It
restyles what the host already renders.

## Documentation

| File | Contains |
|---|---|
| [decision.md](decision.md) | Append-only decisions (D1–D42): what was chosen and why, including the rejected options |
| [architecture.md](architecture.md) | Contracts and boundaries: the plugin shape, the boot audit's failure states, DOM-reachability facts (A1–A12), module structure, profile state, the verification harness, the design-language contract (§9) |
| [flow.md](flow.md) | Runnable sequences: add a feature, the Chrome-before-the-app loop, diagnose "loaded but nothing happened", recover from a boot failure, the isolated-profile test loop, audit a convention (§8) |
| [learning.md](learning.md) | What cost time and why (L1–L40), including the mistakes |
| [docs/research/bento-language-audit.md](docs/research/bento-language-audit.md) | What the theme implements against what the bento idiom requires, measured, tiered P0/P1/P2, with sources |

Read `learning.md` before changing anything here — most of it exists because a
confident-looking change silently did nothing.

## Shape

```
src/00-prelude.js          envelope, constants, shell role names
src/15-tokens.js           design tokens (radii, gutter, surfaces, motion)
src/20-kernel.js           feature registry, shell stamping, style assembly
src/40-feature-sidebar.js  feature: sidebar card
src/45-feature-rows.js     feature: session row tiles
src/50-feature-settings.js feature: the Settings dialog as a bento board
src/60-settings.js         settings rows, derived from the registry
src/99-footer.js           translator, apply(), exports
build.mjs                  concatenates src/*.js -> client.js
verify.mjs                 16 pre-install checks
```

`client.js` is generated. Edit `src/*.js`, then `npm run build`.

## Adding a feature

One file, one `FEATURES.push(...)`:

```js
FEATURES.push({
  id: 'composer-card',
  title: { en: 'Composer card', zh: '输入框卡片' },
  about: { en: '...', zh: '...' },
  order: 20,
  enabled: true,
  css: `html[${ROOT_ATTR}] [${PART_ATTR}="${PART.CENTER}"] { /* ... */ }`,
});
```

The settings row, the storage key, the stylesheet and the document attribute all
follow from that entry. A feature with a runtime half also supplies
`setup(ctx, api)` and returns its disposer.

## How it reaches the shell

Two facts drive the whole design, both verified against this build:

1. **The frame's column wrappers carry hashed CSS-module class names**
   (`mP3x-q_sidebarCol`), so a stylesheet cannot name them.
2. **`single` and `keyed` slots render no `data-slot` anchor** — only list and
   chain slots get one — so there is no stable slot attribute on a column either.

So the kernel locates the frame's three columns structurally once, stamps them
with this plugin's own role names (`data-dsh-bento-part="sidebar"` and friends),
and keeps them stamped through a coalesced `MutationObserver`. Every stylesheet
rule addresses only those names plus the host's documented semantic attributes
(`data-sidebar-collapsed`, `data-composer-card`).

Card geometry is applied as `padding` on the column and `border-radius` on the
card painted in `::after` — never as a change to `grid-template-columns`. The drag
handles are absolutely positioned at the track boundaries, so insetting inside the
column leaves every handle working.

The host's own content root has to be cleared for the card to be seen at all; see
`architecture.md` A9/A10 and the Pass 2 section below. The plugin's settings rows
live in their own Settings tab, registered on the `settings.section` list slot —
see A12 and Pass 4.

## Rules this plugin holds itself to

- Only `--dsw-alias-*` host tokens for colour, so light, dark and any registered
  theme follow automatically. No shade is introduced here.
- No `require` of any Harness Client package; the switch is written locally from
  tokens and matches the host control's geometry and `role="switch"` semantics.
- Every resource is owned by `ctx.effect`, so unload and HMR remove the style
  tag, the observer, the stamps and the dictionary registrations.
- Reduced motion is respected through the token layer, and a literal transition
  duration is a gate failure. The token cannot be the only mechanism: the switch in
  this plugin's own Settings tab is rendered when the theme is off and the stylesheet
  does not exist, so its duration falls back to the OS preference read at render.
- Keyboard focus is never re-drawn. The host supplies the ring; this theme supplies the
  same fill on keyboard focus that it gives on hover, through `:has(:focus-visible)`
  rather than `:focus-within`, which would stick a fill on a row after a mouse click.
- No literal colour anywhere in `src/`, and no transition duration that is not the
  motion token — both are gate failures (checks 14 and 15).
- Under Windows High Contrast the theme withdraws its spacer borders rather than let
  forced-colors paint them, but keeps the card edges, which are what make the
  composition legible once the fills flatten (D46).

## Install

Install through the plugin manager (`install_bundle` with this directory). The
directory is symlinked into the profile, so rebuilding `client.js` changes the
served source, but **the browser only picks up new client code after a reload** —
a running page keeps the module generation it booted with.

## The pass plan

The reference-inspired redesign ships in four passes, one mechanism each, each
verified in Chrome before the next begins.

| Pass | What it changes | Mechanism | State |
|---|---|---|---|
| 1 | canvas, gutter, radii | token values only | **shipped** |
| 2 | reveal the sidebar card | paint order inside one column | **shipped** |
| 3 | card the conversation column, recess the composer | paint order in a second column + a nested surface | **shipped** |
| 4 | move the plugin's rows to their own Settings tab | the `settings.section` slot tree — not CSS | **shipped** |

Sequenced by mechanism rather than by visual size, so a failure is attributable.
See `decision.md` D23–D25 and `flow.md` §7.

## Status

Six features ship:

| id | title | default | what it does |
|---|---|---|---|
| `sidebar-card` | Sidebar card | on | insets the sidebar column onto its own rounded card |
| `row-tiles` | Sidebar tiles | on | rounds sidebar rows (sessions and nav destinations), adds spacing, a hover edge and the accent edge on keyboard focus |
| `center-card` | Conversation card | on | insets the conversation column onto its own card and recesses the composer into it |
| `page-rows` | Page rows | on | gives the rows of full pages mounted in that column (Plugins, MCP) the same tile treatment |
| `rightbar-card` | Right panel card | on | insets the docked right panel onto its own card |
| `settings-bento` | Settings board | on | lays the Settings dialog out as a bento board: navigation on the canvas, content on one raised card, row rules removed |

### Pass 4 (own Settings tab) — shipped

The plugin's toggles now live in their own **Bento layout** tab. Settings ›
General keeps none of them.

```js
ctx.slots.inject('settings.section', () =>
  ctx.slots.register(
    { name: 'settings.section', id: 'bento-theme', order: 30, label: () => 'Bento layout' },
    Panel,
  ),
)
```

Verified in headless Chromium against a running instance:

| Check | Result |
|---|---|
| nav tabs | General, Models, Built-in plugins, Agent presets, **Bento layout**, Remote Access |
| rows in the new tab | **4** — `sidebar-card`, `row-tiles`, `center-card`, `settings-bento` |
| rows left in General | **0** (the old registration is removed, not shadowed) |
| toggling a switch | `aria-checked` flips, writes `dsh-bento-theme:enabled:<id>` to localStorage |
| saved choices | keys unchanged from earlier versions, so they carry over |
| console errors | 0 |

**The nav icon is the settings gear**, not a bespoke glyph. The host picks the
glyph from a hard-coded map keyed on section id and ignores the registration's
`icon` member for a third-party id (A12). Getting a different icon would mean
injecting an element into the host's nav list, which is not exposed.

**The panel supplies its own top offset.** The options area the host renders
sections into is `padding: 0 24px 24px` — no top padding — because every host
section opens with a title block. A plugin section opening straight into rows has
nothing to supply the offset, so its first row landed flush against the card edge
(D31).

**One boot failure during this pass, fixed.** `ROW_ATTR` was declared in
`60-settings.js` but read at module scope by `50-feature-settings.js`, which runs
first — the plugin failed to import and the app would not boot:
`Cannot access 'ROW_ATTR' before initialization`. The constant moved to the
prelude, and `verify.mjs` now checks fragment ordering statically so the next
occurrence is caught before an install (D29).

### Pass 3 (conversation card + recessed composer) — shipped

The conversation column is now a card on the same canvas, and the composer is
recessed into it.

```css
/* The column stops painting and becomes the card's containing block */
[part="center"] { padding: var(--dsh-bento-gutter); position: relative; background: transparent; }
[part="center"]::after { content:""; position:absolute; inset: var(--dsh-bento-gutter);
  border-radius: var(--dsh-bento-radius); background: var(--dsh-bento-card);
  border: 1px solid var(--dsh-bento-edge); pointer-events:none; }

/* The root: anchors carry data-slot, the root does not, so :not() skips an anchor
   at ANY depth — the centre has two anchors where the sidebar has one. */
[part="center"] > * > *:not([data-slot]),
[part="center"] > * > * > *:not([data-slot]) {
  background: transparent; max-width: 100%; box-sizing: border-box;
  position: relative; z-index: 1;
}

/* The composer: canvas tone + hairline as an INSET SHADOW, never a border */
[part="center"] [data-composer-card] {
  background: var(--dsh-bento-canvas);
  box-shadow: inset 0 0 0 1px var(--dsh-bento-edge);
}
```

Verified in headless Chromium, both themes, including with a **live session open**:

| Check | Light | Dark |
|---|---|---|
| canvas : card | 1.164 | 1.235 |
| **composer : card** | **1.164** (was 1.0 — invisible) | **1.235** |
| card radius | 20px | 20px |
| card painted width | 1134px in a 1160px column | same |
| composer box | 759×114, **border-width 0** | same |
| elements spilling past the card | **0** | **0** |
| horizontal scroll | none (1160/1160) | none |
| console errors | 0 | 0 |

Pixel scan across the middle of the card, light mode:

```
x  270..291  rgb(235,238,242)   canvas gutter 22px
x  293..1426 rgb(255,255,255)   OUR CARD 1134px
x 1428..1439 rgb(235,238,242)   canvas gutter 12px
```

And vertically through the composer, showing it reads as a recessed panel:

```
y  380..442  rgb(255,255,255)   card
y  444..555  rgb(235,238,242)   composer — canvas tone, inset into the card
y  557..619  rgb(255,255,255)   card
```

The card's rounded corner was confirmed by pixel map with a session open (header
and tab row at the top edge do not square it off).

**The selector is not shared with the sidebar, on purpose.** The sidebar has one
`display: contents` anchor before its root; the centre has two. Copying the
sidebar's `> * > *` matched a 0×0 anchor and silently did nothing — see D26/A11.

**One pre-existing failure, not ours.** Opening a session in the test instance
shows *"Failed to load history: ... event type 'job/registered' ... unknown to
this harness"*. That is a session-log version mismatch between harness builds,
reproduces without this plugin, and renders in the host's own error styling. Noted
so it is not mistaken for a regression (D28, L26).

### Pass 2 (sidebar card revealed) — shipped

The sidebar card is now actually visible. Before this pass it was painted but
**covered** by the host's own content root — an opaque `#f9fafb` rectangle,
280px wide with `border-radius: 0`, sitting on top of it. Only the gutter ring
had ever been visible, which is why it read as a contrast problem for two sessions.

```css
/* The column's DOM child is the display:contents anchor (no box), so the child of
   that anchor is exactly the host's content root. Pure structure, no class name. */
html[data-dsh-bento] [data-dsh-bento-part="sidebar"] > * > * {
  background: transparent;
  max-width: 100%;      /* the root is wider than the column's padding box */
  box-sizing: border-box;
  position: relative;
  z-index: 1;           /* above the painted card */
}
```

Verified in headless Chromium, both themes, by reading the render's own pixels:

| Scan at y=450 | Light | Dark |
|---|---|---|
| canvas (left gutter) | `rgb(235,238,242)` ×12px | `rgb(27,27,28)` ×12px |
| **card (ours)** | **`rgb(255,255,255)` ×254px** | **`rgb(44,44,46)` ×254px** |
| canvas (right gutter) | `rgb(235,238,242)` ×12px | `rgb(27,27,28)` ×12px |

Before the fix that middle run was the host's `#f9fafb` / `#1b1b1c`, not ours.

Also verified:

- **Root clamped to the card**: 256px, equal to the column's 12px-padded box.
  Previously 280px in a 264px box, spilling 16px past the card's edge.
- **Rounded corners visible**: a pixel map of the card's top-left corner shows
  the diagonal canvas→card transition of a 20px radius.
- **0 of 13** session rows overflow the column.
- **Collapsed rail intact**: 56px column, 4px gutter, 10px radius, root 48px.
- **Settings dialog intact** and now sits on the cool canvas (`#ebeef2`); card
  white, radius 14px, **0 of 14** rows drawing a rule.
- **Row hover intact**: hovering one row adds the theme edge to *that* row only
  (`rgba(0,0,0,0.1)`); the host's selected row keeps its own tint.
- Zero console errors, zero page errors.

**Not a regression, though it looks like one.** Session rows are
`role="treeitem"` divs with no `tabindex`, so the host never made them
focusable and this theme's `:focus-visible` rule cannot fire. That is a
pre-existing property of the host's markup (L22).

**Scoped on purpose.** The centre column is still a flat white panel — carding it
is pass 3. The asymmetry is expected mid-sequence.

### Pass 1 (canvas, gutter, radii) — shipped

| Change | Before | After |
|---|---|---|
| canvas (light) | `#f9fafb` | **`#ebeef2`** cool blue-grey |
| canvas (dark) | `#1b1b1c` | `#1b1b1c` (different token, same value) |
| canvas : card contrast | 1.045 | **1.164** light / 1.235 dark |
| gutter | 8px | **12px** |
| card radius | 14px | **20px** |
| inner radius | 10px | **14px** |

Verified in headless Chromium against an isolated `web` profile, both themes:

- Tokens applied and read back from the live page: `--dsh-bento-canvas` resolves
  to `#ebeef2` light and `#1b1b1c` dark.
- Frame background paints the canvas; the sidebar column inherits it.
- Gutters and radii applied: sidebar card 20px radius at a 12px inset.
- Session rows picked up the 14px inner radius (`YDXeBa_sessionRow`); the host's
  own `projectRow` (12px) and `sessionOverflowButton` (8px) are untouched, as
  intended.
- **0 of 13** session rows overflow the column at 12px. At 14px all 13 do — that
  measurement is why the gutter is 12 and not the reference's 16.
- Zero console errors, zero page errors, in both themes.

**What pass 1 deliberately did not do.** The canvas is currently visible only as
the 12px ring around each column, because the host's own content roots still paint
opaque rectangles over the cards (see `architecture.md` A9). Pass 1 is a palette
and geometry change; the composition change is pass 2.

### Earlier status (pre-pass-1)

Features at that time: `sidebar-card`, `row-tiles`, `settings-bento` (no conversation card yet).

**Verified in a real browser** (headless Chromium against an isolated `web`
profile, not the desktop profile):

- The plugin activates with **zero console errors** and no boot audit failure.
- All four shell roles are stamped: `frame`, `sidebar`, `center`, `rightbar`.
- The stylesheet is injected with the token layer and all three feature blocks.
- **Settings › General showed all three rows** at that time — "Sidebar card", "Session tiles"
  and "Settings board", each with a working `role="switch"` toggle. They moved to their
  own **Bento layout** tab in pass 4.

**The Settings board, measured in light and dark across all five sections:**

| Check | Light | Dark |
|---|---|---|
| panel canvas | `#f9fafb` | `#1b1b1c` |
| content card | `#fff` | `#2c2c2e` |
| card is *lighter* than canvas | yes (1.045) | yes (1.235) |
| card inset / radius / edge | 8px / 10px / 1px 10% | same |
| active nav tile | `#fff` + 1px inset edge | `#2c2c2e` + 1px inset edge |
| rows still drawing a rule (General) | 0 of 14 | 0 of 14 |
| Appearance control across one line | yes (3 cubes, 183px each) | yes |
| content column width | 612px (unchanged) | 612px |
| console errors | 0 | 0 |

Hover verified: exactly one row fills (`rgba(38,49,72,0.06)`), and the row's
labels do not move (`titleX`/`titleY` identical before and after).

**Known limits, stated plainly:**

- Only the General section's rows are restyled. The Models, Built-in plugins,
  Agent presets and Remote Access sections keep their own internal rules and
  controls; the redesign reaches them as a *surface* (canvas + card) but not at
  row level. That is deliberate — those sections' rows are not uniform.
- Not verified: the desktop app itself. The bundle the desktop profile resolves is
  the current one, but a running page keeps the module generation it booted with,
  so the user must reload before the change is visible.

## Root cause of the earlier failures (2026-11-03)

Three separate defects, all found by running it rather than reasoning about it:

1. **`apply` mutated `ctx`.** `ctx.bentoTranslate = ...` writes an ad-hoc property
   onto a framework-owned Cordis context. That throw happened *before* the
   try/catch and before the settings row registered, so the plugin reported
   `failed` and nothing appeared. The translator is now a local variable passed
   down explicitly. `apply` also no longer lets anything escape.
2. **The stylesheet referenced host tokens from the wrong element.** A custom
   property is substituted on the element that declares it and does not inherit
   *upward*. The host defines `--dsw-alias-*` on `<body>`, so declaring
   `--dsh-bento-card: var(--dsw-alias-bg-layer-1)` on `html` resolved against
   nothing and silently painted transparent. All surface tokens now live on
   `body`.
3. **The tag observer watched an anchor that did not exist yet.** The client half
   activates before the shell renders, so `querySelector('[data-slot="root"]')`
   was null at that moment and the observer was never attached — leaving every
   feature permanently unstyled. It now observes `document.body`.

A fourth, caught by `node --check` before it could ship: a backtick inside a CSS
comment terminated the template literal early.

## Incident: boot failure (2026-11-03)

Installing version 0.1.0 broke application startup with:

```
Error: web boot: 1 entry did not activate
dsh-bento-theme: loading
```

`loading` is the specific signal: the entry's import promise never settled, so
the host half never reached `active` and the web boot audit aborted the whole
startup. The desktop recovery dialog then ran "disable third-party plugins",
which removed this bundle **and** rewrote the profile's `cordis.patch.yml` from
5278 to 1345 bytes, dropping 13 configuration rows (`ui-settings-general`,
`agent-default-model`, nine `llm-pi-ai` models, `web-ui-*` rows, the
`dsh-claude-style` config, `plugin-market`).

Recovery performed:

- Restored `cordis.patch.yml` from the automatic backup, verified byte-identical
  (5278 bytes, 18 rows, both providers, all 9 models).
- Re-enabled the bundles the recovery had disabled.
- Left this bundle **disabled**.

### Corrections made to the bundle

Two manifest divergences from every working third-party theme on this machine
(`dsh-skin`, `dsh-claude-style`, `dsh-cost-meter`):

| Field | Before | After |
|---|---|---|
| `main` | missing | `index.js` |
| `./package.json` export | missing | declared |
| host export | `export function apply` | `export default { apply }` |

Whether `main` is the actual cause is **not proven** — the boot log records the
audit result, not the loader's internal reason, and the entry never reported an
import error. What is established: the fixes remove the divergences, the host
half now imports and exports exactly as the working themes do, and
`verify.mjs` gates installation from here on.

### Regression guard

`node verify.mjs` runs 16 checks before any install and exits non-zero on
failure. Both original failure modes were proved by planting them: a missing
`main` is reported, and a host half that throws on import is reported cleanly
instead of crashing the checker itself.

Two further checks cover the backtick-in-a-CSS-comment hazard. They are proved the
same way — by planting a violation and watching them name the cause. The second
of them reads the *built* `client.js` and asserts every `*_CSS` literal has
balanced braces, because a stray backtick often leaves the bundle as valid
JavaScript while silently truncating the stylesheet. See D16 and L14.

Check 14 (`source: no transition hardcodes a duration`) prevents the reduced-motion
defect from returning. It was proved red against three plants — the original `160ms`
literal, a `0.16s` variant, and a literal inside a CSS template literal in a different
fragment — because a check seen only green is indistinguishable from one that cannot
go red. See D43 and L42.

## Verifying a UI change

The rule is D12, the sequence is `flow.md` §2: probe the DOM, prove the selectors,
render in headless Chrome against the isolated `web` profile, measure every claim
as a number, and only then install. `architecture.md` §8 lists the scripts.

The isolated profile is torn down after every run and restored byte-identical, so
a stale junction or patch row cannot change what a later session is testing.

