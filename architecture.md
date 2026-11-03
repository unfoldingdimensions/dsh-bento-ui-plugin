# Architecture

Contracts, boundaries and shapes for `dsh-bento-theme`. Every statement below was
read from the installed DSH runtime (`0.2.1-rc.5`) or observed in a rendered page,
not inferred. Verified 2026-11-03.

---

## 1. What a DSH UI plugin is

A bundle is an npm package. Three parts matter:

| Part | File | Role |
|---|---|---|
| Host half | `index.js` | imported by the Loader; must export a plugin |
| Patch | `cordis.patch.yml` | inserts the row that mounts the host half |
| Client half | `client.js` | browser bundle registering `window.__ModuleLoader__.load({id, factory})` |

A fourth declaration wires the client half to the browser roster:

```json
"dsh": {
  "bundle": { "patch": "./cordis.patch.yml" },
  "client": { "platform": "web", "immediately": true, "inject": ["<pkg>", ...] }
}
```

`dsh.client` is validated strictly by `@deepseek-ai/dsh-client-modules`. It
accepts exactly four members: `platform` (required string), `inject`, `external`,
`immediately`. Anything else is ignored.

**The host half must stay inert.** Every working third-party theme on this machine
(`dsh-skin`, `dsh-claude-style`, `dsh-cost-meter`) has an `apply()` that does
nothing or almost nothing. All rendering lives in the client half. Work in the
host half turns any mistake into a whole-application boot failure.

---

## 2. The boot contract, and what its failure states mean

`client.js` under `dsh-web-frontend` runs a web boot audit. Its report is the
fastest diagnostic available:

| Reported state | Meaning |
|---|---|
| `loading` | the entry's import promise never settled |
| `failed` | the module failed to import, or `apply` threw |
| `pending (waiting for service: X)` | an injected service never appeared |
| `import failed: <error>` | transport/registration/dependency/factory error, with text |

Reading `cordis-plugin-loader` settles the distinction:

```js
async _init() {
  try { moduleNamespace = await this.parent.tree.import(this.options.name, ...) }
  catch (error) { this.ctx.logger.error(error); return }   // fiber stays undefined → "failed"
  const plugin = this.loader.unwrapExports(moduleNamespace);
  this.fiber = this.ctx.registry.plugin(plugin, ...).ctx.fiber;
}
```

So an import error and an `apply` throw both surface as `failed`; `loading` means
the promise never resolved. This distinction ruled out several wrong theories.

**Export normalisation** (`unwrapExports`), verbatim:

```js
unwrapExports(exports) {
  if (isNullable(exports)) return exports;
  exports = exports.default ?? exports;
  if (!exports.__esModule) return exports;
  return exports.default ?? exports;
}
```

Both `export function apply()` and `export default { apply }` are therefore valid.
Neither `main` nor the export form was ever the cause of a failure here.

---

## 3. DOM reachability (the constraint that shapes everything)

### A1 — Slot anchors
The renderer wraps list/chain slots in a div with `data-slot="<key>"` and
`style: display:contents`. **`single` and `keyed` slots render no anchor at all**
(`if (kind === "single") return guarded(...)` — the entry renders directly). So
there is no `data-slot` hook on the sidebar column or on the `main` panel.

`display:contents` also means the anchor has **no box**: it cannot be styled or
painted. A card cannot hang on it.

### A2 — Class names are hashed
The frame's columns carry CSS-module class names hashed per build
(`mP3x-q_sidebarCol`, `pI_x6G_sidebarCol` for two observed builds). They cannot be
named in a stylesheet that must survive an app update.

### A3 — Stable semantic attributes that do exist
Written by the host itself, safe to target:

| Attribute | On | Notes |
|---|---|---|
| `data-sidebar-collapsed` (on the frame div) | frame | collapse state |
| `data-shell-bottom`, `data-shell-overlay`, `data-shell-leading` | frame children | self-identifying rows |
| `data-side` | drag handles | resize handles |
| `data-composer-card` | composer | resident composer card |
| `data-row-key="session:<id>"` | session row | 32px flex row |
| `data-row-key="workspace:<key>"` | workspace heading | 34px row |
| `data-ds-dark-theme` | body | light/dark switch |

### A4 — Frame child order
Direct `div` children of the frame, in order: sidebar column, centre column,
right column, bottom row, overlay layer, and (macOS only) the leading seat.
Narrowing by "is a div and not one of the four self-identifying rows" yields
exactly the three columns.

### A5 — Custom property inheritance direction
A custom property is substituted **on the element that declares it**. Values
inherit *downward*. The host defines `--dsw-alias-*` on `<body>`, so any token
whose value is `var(--dsw-alias-...)` must also be declared on `<body>` (or
deeper). Declared on `<html>`, it resolves against nothing and the property
computes to an empty value — which paints as transparent, with no error anywhere.

This one rule explains an entire class of "my CSS does nothing" symptoms.

### A6 — Activation precedes rendering
The client half's `apply` runs **before** the shell mounts. `document.querySelector('[data-slot="root"]')`
is null at that moment. Anything that must touch the shell needs either a retry
or an observer on a node that already exists (`document.body`).

### A7 — The Settings dialog has its own stable hooks

Settings is a separate surface from the shell frame, mounted only while it is
open. It is reachable without stamping, because the host labels it:

| Hook | On | Notes |
|---|---|---|
| `data-shortcut-modal="settings"` | panel | the only element with this value; also `role="dialog"` |
| `> nav` | first child | the 188px navigation column |
| `nav button[aria-current="true"]` | selected cell | the real semantic hook for the active destination |
| `> div:has([data-slot="settings.section"])` | second child | the content column |
| `[data-slot="settings.general.item"]` | row anchor | `display: contents`; its **children** are the rows |
| `[data-slot="settings.action"]`, `settings.close`, `settings.header`, `settings.launcher`, `settings.trigger` | other anchors | all `display: contents`, no box |

Measured shape (1280×900 viewport, 800px panel):

```
div[data-shortcut-modal=settings]   800x800, flex, radius 28px, bg #fff
 ├─ nav                             188 wide, padding 22px 12px 0, gap 18px
 │   ├─ navTitle                    16px/24px 500
 │   ├─ [data-slot=settings.header]  display:contents
 │   └─ navList → 5x button         40px tall, radius 12px, 14px/22px 400
 └─ div[content]                    612 wide, flex column
     ├─ header                      54px tall
     └─ options                     padding 0 24px 24px, overflow-y auto
         └─ [data-slot=settings.section]  display:contents
             └─ div[section]        flex column
                 └─ row             16px 0 padding, border-bottom 1px
```

**Row class names are per-component hashes** and there is one per section:
`oY77xG_row`, `hVGvvW_row`, `_8XZxNq_row`, `Pt1bsG_row`, `nhfO0a_setting`,
`T1PP_q_row`, `gi5gtW_row`, `_8HJdBW_group`, `zGbnIq_rowCard`. The General
section alone contains 8 of them. A rule written against one hash covers one row
shape in one section; a new section brings a new hash with no warning. Row styling
therefore has to go through the `settings.general.item` anchor.

**A control the host sized exactly.** The Appearance row is three cubes at
`flex: 1 1 180px` inside `flex-wrap: wrap` with an 8px gap. It needs
3×180 + 2×8 = **556px** inside a **564px** row — 8px of slack. Narrowing the
content column by more than 8px makes the third cube wrap to its own line. This
is why the settings card is painted rather than inset (D14).

### A8 — The container query hook: `:has()`

The content column carries no class a stylesheet may name, but it is identifiable
by what it contains: `[data-shortcut-modal="settings"] > div:has([data-slot="settings.section"])`.
`:has()` is supported in the Chromium the app ships (verified live:
Chrome/156). Both `:has()` selectors used by the theme were confirmed to match
exactly one element each on the live page.

### A9 — The host's content roots paint over the columns

This is the most important fact for the canvas work, and it was not visible from
source before it was measured.

Each column's only child is the `display: contents` slot anchor. That anchor's
child is the host's own **content root**, and it carries an opaque background:

| Column | Host root class | Background | Width | Radius |
|---|---|---|---|---|
| sidebar | `hHd-Xa_root hHd-Xa_quietBars` | `#f9fafb` | **280px** | **0** |
| centre | `wSkVaW_root` | `#ffffff` | 1160px | 0 |

The sidebar column is 280px wide with `padding: 8px`, so its padding box is
**264px** — but the host root inside it is **280px**, 16px wider than the box that
contains it. Two consequences:

1. **A card painted in `::after` is covered.** Only the gutter ring is ever
   visible, because an opaque, `border-radius: 0` rectangle sits over the card's
   whole interior. This is why the card looked "white on white" (L7): the interior
   was never the card.
2. **Content spills past the card's rounded corner.** Before pass 1 the spill was
   16px; at a 12px gutter it is 8px. It was invisible only because the overflowing
   strip happened to match the canvas colour.

Class fragments like `_root` are **not** stable hooks in general. They are the
only handle on these two roots, so the theme treats them as a scoped best-effort
selector: always combined with the column's part attribute, and always paired with
`max-width: 100%` so the root cannot exceed its column.

---

### A10 — The content root is reachable without a class name

The column's DOM shape is fixed and shallow:

```
div[data-dsh-bento-part="sidebar"]      the column, padding = gutter
 └─ div[data-slot="sidebar"]            display: contents — NO BOX
     └─ div.hHd-Xa_root                 the host's content root — opaque fill
         └─ …                           five regions, session tree, footer
```

Because the anchor has no box, the column's *layout* children are the root's
children — but the column's *DOM* child is the anchor. That makes
`> * > *` an exact, structure-based handle on the root:

| Selector | Matches | Notes |
|---|---|---|
| `> *` | the `display:contents` anchor | zero-size |
| `> * > *` | **the content root** | exactly 1 element |
| `[class*="_root"]` (scoped) | up to 25 elements | also hits nested `_root`s |

The theme uses `> * > *`. Verified live: one element, `hHd-Xa_root
hHd-Xa_quietBars`, and after the fix its width is 256px — equal to the column's
padding box — with `background: transparent`, `max-width: 100%`, `z-index: 1`.

---

### A11 — Anchor depth differs per column

`display: contents` anchors sit between a column and its content root, and the
number of them is **not uniform**:

| Column | Chain to the root | `> * > *` hits |
|---|---|---|
| sidebar | column → anchor(`sidebar`) → root | **the root** |
| centre | column → anchor(`main`) → anchor(`main.conversation`) → root | a 0×0 anchor |

This is why the sidebar's selector cannot be copied into the centre feature. The
reliable discriminator is the attribute: anchors always carry `data-slot`, the
root never does. So `:not([data-slot])` is the rule that survives the difference.

Verified live:

```
DIV.pI_x6G_centerCol                 1160x900  flex
  DIV[slot=main]                        0x0    display:contents
    DIV[slot=main.conversation]         0x0    display:contents   <- > * > * lands here
      DIV.wSkVaW_root                1136x876  flex, opaque fill <- the real root
```

---

### A12 — `settings.section` is the tab registry

The Settings dialog's navigation is a **list slot**, not a hard-coded list. The
host registers its own tabs into it and a plugin can too:

```js
ctx.slots.register(
  { name: 'settings.section', id: 'bento-theme', order: 30, label: () => 'Bento layout' },
  Panel,
)
```

| Fact | Value |
|---|---|
| slot kind | `list`, scope `root` |
| nav rows built from | `ctx.slots.entries('settings.section')`, sorted by `order` |
| label | resolved through `resolveSlotLabel`, so a function follows the locale |
| active state | host writes `aria-current="true"` on the selected cell |
| nav glyph | chosen by a **hard-coded id map** (`navIcon(id)`); unknown ids get the settings gear |
| body mount | `renderSlot('settings.section', { close }, { only: active })` into the options area |

**The container supplies the width, not the chrome.** The options area is
`padding: 0 24px 24px` — no top padding — because every host section opens with a
title/intro block. A plugin section that opens with rows must add its own top
offset (D31). Its rows otherwise land flush against the card's top edge.

**Working precedent on this machine:** `dsh-skills-doctor` registers a
`settings.section` tab the same way, so this is a supported extension point, not
a hack.

---

## 4a. Measured design tokens (pass 1, 2026-11-03)

Values the theme ships after pass 1, read from a rendered page in both themes.

| Token | Light | Dark | Note |
|---|---|---|---|
| `--dsh-bento-canvas` | `#ebeef2` | `#1b1b1c` | different host token per theme (D17) |
| `--dsh-bento-card` | `#ffffff` | `#2c2c2e` | `bg-layer-2` |
| `--dsh-bento-edge` | `rgba(0,0,0,0.1)` | `rgba(255,255,255,0.12)` | `border-l2` |
| `--dsh-bento-gutter` | 12px | 12px | 14px breaks all 13 rows (D18) |
| `--dsh-bento-radius` | 20px | 20px | was 14px |
| `--dsh-bento-radius-inner` | 14px | 14px | was 10px |
| `--dsh-bento-radius-rail` | 10px | 10px | collapsed rail keeps a 4px gutter |

Canvas-to-card contrast: **1.164 light**, **1.235 dark** (was 1.045 light).

Row radii observed in the sidebar after pass 1 — only one of the three is ours:

| Row | Radius | Owner |
|---|---|---|
| `session:*` (`YDXeBa_sessionRow`) | 14px | **this theme** |
| `workspace:*` (`YDXeBa_projectRow`) | 12px | host |
| `overflow:*` (`bhn1Oq_sessionOverflowButton`) | 8px | host |



---

## 4. Module structure

```
dsh-bento-theme/
  package.json          manifest: main, exports, dsh.bundle, dsh.client
  index.js              host half — export default { apply() {} }
  cordis.patch.yml      one insert row
  build.mjs             concatenates src/*.js → client.js
  verify.mjs            13 pre-install checks, exits non-zero on failure
  client.js             GENERATED — do not edit
  src/
    00-prelude.js       window loader envelope, constants, shell role names
    15-tokens.js        design tokens (radii, gutter, surfaces, motion)
    20-kernel.js        feature registry, shell stamping, style assembly
    40-feature-sidebar.js   feature: sidebar card
    45-feature-rows.js      feature: session row tiles
    50-feature-settings.js  feature: the Settings dialog as a bento board
    60-settings.js      settings rows derived from the registry
    99-footer.js        translator, guarded apply(), module exports
```

Fragments share one lexical scope, so a `const` in one is visible in the next.
Names must be unique across fragments. Files are concatenated in filename order.

### The feature contract

```js
FEATURES.push({
  id,                     // stable; also storage suffix and CSS marker
  title: { en, zh },      // settings row title
  about: { en, zh },      // one-line description
  order,                  // settings row position
  enabled,                // default when the user has not chosen
  css,                    // injected only while the feature is on
  setup(ctx, api),        // optional runtime half; returns a disposer
})
```

The kernel derives from that entry: the settings row, the storage key, the
stylesheet block, the teardown.

### Kernel responsibilities

- `stampShell()` — idempotent, mutation-quiet; writes `data-dsh-bento-part` on
  frame + three columns.
- `paint()` — one style tag for all active features, always prefixed with
  `BASE_CSS` (the token layer; a feature's CSS is meaningless without it).
- `paintRoot()` — sets/removes `data-dsh-bento` on `<html>` when any feature is on.
- `reconcile(feature)` — runs/tears down a feature's `setup`.
- `useFeatureStates()` — `useSyncExternalStore` over a revision counter.

---

## 5. Runtime wiring

```
keychain/root slot
 └─ div[data-slot="root"]           display:contents
     └─ div[data-dsh-bento-part=frame]
         ├─ div[data-dsh-bento-part=sidebar]  ← padding: gutter (canvas bg)
         │   └─ div[data-slot="sidebar"]      display:contents, no box
         ├─ div[data-dsh-bento-part=center]
         ├─ div[data-dsh-bento-part=rightbar]
         ├─ div[data-shell-bottom]
         └─ div[data-shell-overlay]
```

The card is painted on the column's `::after` (inset by the gutter), because the
only content child is the zero-size anchor (A1). Content is lifted with
`position: relative; z-index: 1`.

Settings row registers into `settings.general.item`, a list slot that renders
only while the Settings panel is open — so its absence from `document.body` at
boot proves nothing.

---

## 6. Verification surface

| Method | Reaches | Limits |
|---|---|---|
| `cordis_inspect_query` (client `Slots`) | live slot tree, registrations | cannot see inside a plugin's own DOM |
| `node --check` | syntax | not runtime |
| `node verify.mjs` | manifest, host import, bundle parse | not browser behaviour |
| Headless Chromium via `playwright-core` | computed styles, injected CSS, screenshot | needs the isolated profile + auth token |
| `design_audit` | type scale, contrast, spacing | needs the authenticated page |

Authenticated page access: `GET /?token=<token>` returns 303 and sets a cookie;
subsequent requests need that cookie. `window.__DSH_BOOT__` holds `{rev, entries,
batches}` — the client module roster, useful for confirming a bundle is served.

---

## 7. Profile state (2026-11-03, after repair)

| Item | Value |
|---|---|
| dsh runtime | `0.2.1-rc.5` |
| CLI on PATH | `0.2.0-rc.2` (version skew — the app bundles the newer runtime) |
| desktop profile | Electron-owned; CLI management refused |
| desktop patch | 5278 bytes, 18 top-level rows, restored byte-identical from backup |
| desktop bundles | 23 |
| plugin state | `dsh-bento-theme` installed and enabled; `client.js` 29072 bytes, 3 features |
| web profile | clean, no bento row, no junction, patch byte-identical (343 b) after teardown |

"18 rows" counts top-level `- id:` entries. An indented `- id:` count returns 27,
because `insert:` blocks contain their own child ids; that number is not the row
count and was misreported once.

## 8. Verification harness (Chrome, isolated profile)

The rig used to prove every UI claim in these docs. All of it is scratch under
`research_tmp/`, none of it ships.

```
profiles/web/node_modules/dsh-bento-theme  -> directory junction to the package
profiles/web/cordis.patch.yml              -> + one insert row (a .bak is written first)
dsh --profile web --port 51999 --no-open   -> prints ?token=...
playwright-core + Chrome 156               -> goto /?token=<token>
```

| Script | Answers |
|---|---|
| `browser-verify.cjs` | does the plugin activate, stamp, paint a style tag, throw in console |
| `probe-settings-dom.cjs` | what the Settings dialog's subtree actually looks like |
| `probe-settings-metrics.cjs` | measured typography, box model, separators, host switch |
| `probe-all-sections.cjs` | every section, and which of its boxes could be a row |
| `probe-selectors.cjs` | does each candidate selector match exactly what it should |
| `probe-cube-wrap.cjs` | did the Appearance control survive, or reflow |
| `probe-row-bg.cjs` | is any row tinted, and did any row move |
| `verify-settings.cjs` | computed styles of the finished panel + contrast |
| `verify-settings-themes.cjs` | the same, in light **and** dark, across all 5 sections |
| `verify-settings-hover.cjs` | one row fills on hover, labels do not shift |

Two measurement methods are used deliberately:

1. **`getComputedStyle` in the live page** for layout and colour facts.
2. **Reading the screenshot's own pixels** (`System.Drawing` in PowerShell) when
   a visual impression contradicts computed style. This settled a false "the rows
   are tinted grey" reading: every scanline's modal colour was `rgb(255,255,255)`,
   so the bands were anti-aliased text, not a style. Computed style and the
   rendered file are different evidence and both are needed.

---

## 9. Design-language contract (audit 2026-11-03)

What the theme may do to a surface, stated as rules so a future feature does not
have to rediscover them. Derived from the 12-page reference corpus and from measuring
the shipped plugin; the full inventory with evidence is
`docs/research/bento-language-audit.md`.

### 9.1 The surfaces, measured

| | light | dark |
|---|---|---|
| canvas | `#ebeef2` (host nav-item-active) | `#1b1b1c` (host sidebar fill) |
| card | `#ffffff` (host bg-layer-2) | `#2c2c2e` |
| card vs canvas | **1.164** | **1.235** |
| card edge vs card | 1.254 | 1.464 |

The fill step is the card. The edge is decorative. **Elevation is always zero** —
86 of 86 reference cards have `box-shadow: none`, and the theme's only two shadows are
`inset 0 0 0 1px` hairline replacements that cost no layout (D14).

### 9.2 Radius vocabulary

| Tier | Value | Used by |
|---|---|---|
| card | 20px | sidebar, centre, right panel |
| inner | 14px | rows, tiles, nav buttons, settings rows |
| rail | 10px | the card when the sidebar is collapsed to 56px |
| pill | host | not ours |

The reference runs 24 / 18 / 12; ours is scaled down one step because a column here
is narrower than a 660px reference card. `14px` inner is **not** the concentric result
for a 12px inset under a 20px card — the maths gives 8px — and the host's own icon
buttons in the same container already use 8. Recorded as a known inconsistency
(audit P2.2), not a bug.

### 9.3 What a feature may and may not touch

| May | May not |
|---|---|
| paint a card, clear a host root, lift content above it | change a grid track, a column width, or a drag handle |
| add a gutter as **padding on the column** | add a gutter as margin on the column (moves handles) |
| supply a hairline as `inset box-shadow` | supply it as `border` on a host-sized control (costs 2px, D14) |
| restyle a host row's geometry | restyle a host page's typography, badges or switches (D35) |
| read a host token | introduce a shade of its own outside the artwork |

### 9.4 DOM facts a contrast or accessibility tool must know

1. **Cards live on `::after`.** They are not ancestors of their content, so any
   DOM-walk contrast check reports the canvas instead of the card. Measured error:
   4.98 reported against 5.80 actual.
2. **Session rows are `role="treeitem"`, `tabIndex=-1`, with zero focusable
   descendants.** The host never moves focus into the tree, so a
   `:focus-visible` rule on a row is correct and unreachable. Do not write one and
   claim a keyboard affordance.
3. **Our own switch's transitions are inline**, so `prefers-reduced-motion` in the
   stylesheet cannot reach them (audit P1.1).
4. **The composer is 214–331px from the card's edges.** Its 28px radius is
   independent by the >24px rule, not a concentric-radius defect.

### 9.5 Spacing, and where it breaks the idiom

| | theme | convention |
|---|---|---|
| gutter (column padding) | 12px | — |
| gap between cards | 24px | — |
| gap / radius | 24/20 = 1.2 | 0.5–1.0 |
| outer margin / gap | 12/24 = **0.5** | ≥1.5 |
| inner padding / gutter | ~13/24 = 0.54 | ~2 |

The theme is a three-pane application shell wearing card surfaces. That is a decision
(D41), not an oversight: the outer margin is owned by the frame, which carries an
inline `grid-template-columns` and cannot take padding without moving every column.
