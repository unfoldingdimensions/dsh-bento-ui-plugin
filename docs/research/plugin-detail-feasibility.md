# Feasibility: the "Plugin detail" reference against the real harness

Assessed 2026-11-04. The reference is
`RSI Paid Marketing – Bento – Harness – Plugin detail.html` (521 KB, a saved design file with an
embedded bundler manifest). Unpacked and rendered; every verdict below was then checked against a
live harness instance in the isolated `web` profile.

**One-line answer: about 22 of 24 elements are achievable, 8 of them by changing values only. Two
are not achievable at all — the fake window chrome and the usage tile — and one of them is not
achievable because the data does not exist.**

---

## 1. What the reference actually is

A design mock of **two surfaces**, not one:

- **The sidebar at 272px** — brand row, accent New Session button, nav, workspaces, session rows
  with age pills, a dark usage tile, and a signed-in footer.
- **A plugin detail page at 1440px** — breadcrumb pill, a 12-column bento grid containing a hero,
  a Components section, a Source card (span 7) and a dark Update tile (span 5).

It also carries two things that are **design-tool artifacts, not product features**: a
`data-canvas-width="1440"` marker, and a `theme` prop with blue/orange palettes (25 tokens each).

---

## 2. The finding that matters

**The harness already has the page.** It is not something you would build — it exists today at
Plugins → any installed plugin, and it already renders a hero with icon, title, version pill,
package name, description, Uninstall, a switch, and a Components section with counts.

The three extension points it exposes are **empty list slots**:

```
plugins.detail.actions    kind: list, scope: root
plugins.detail.badge      kind: list, scope: root
plugins.detail.section    kind: list, scope: root
```

The reference's Source card and dark Update tile map directly onto `plugins.detail.section`. The
version pill maps to `plugins.detail.badge`. The Uninstall button already lives in the actions area.

So the work is **restyling an existing page and adding two tiles**, not building a page.

**Getting there is not obvious, and that matters for testing.** The card *body* does nothing when
clicked; the row opens from the **title button** (`button.X_2TxG_cardTitle` / `.cardOpen`). My first
verification run clicked the card body, landed nowhere, and reported the detail page as absent —
eight failures, all false. Re-run against the title button, all eight pass, twice from a clean
profile. Anyone writing a probe here should click the title.

---

## 3. Element-by-element

Verdict key: **exists** = already rendered by the host, restyle only · **CSS** = new styling, no new
DOM · **slot** = needs a small component mounted into an existing slot · **no** = not possible.

### 3.1 Sidebar

| # | Element in the reference | Verdict | Notes |
|---|---|---|---|
| 1 | Sidebar as a card, radius 24, padding 16/12, gap 14 | **exists** | Bento already cards the sidebar (radius 20, inset 12). Value change only |
| 2 | Brand: 32px accent tile + "deepseek" + HARNESS badge | **exists** | The host renders all three. `sidebar.brand.mark` / `.name` slots confirm it |
| 3 | New Session: accent-soft fill, accent-line border, radius 14, accent-ink text | **CSS** | Bento's selected-row trio already reproduces `#E8EFFE`; needs one new `accent-line` token |
| 4 | Nav rows, selected = accent-soft + weight 600 | **exists** | Bento implements exactly this (D55 tint, D58 weight) |
| 5 | "WORKSPACES" 11px uppercase + 3 icon actions | **exists** | Host renders the label and search / view-options / add-workspace buttons |
| 6 | Workspace rows, radius 12 | **exists** | Host draws 12px; bento preserves it (D45) |
| 7 | Session rows + **age pill** ("1h", "6h", "8d") | **CSS** | **The host already renders the age** — measured `"Bento UI plugin | 6min"`. Restyle text → pill |
| 8 | "Show 5 more sessions" | **exists** | Host button, already present |
| 9 | **Dark usage tile** — "$0", "518M tokens", progress bar, "Off-peak · 12h 14m left", "Peak Thu 09:00", "Balance ↗" | **no** | See §4.1. No such data reaches a client plugin |
| 10 | Signed-in footer — avatar, "Signed in to DeepSeek", "516M today" | **slot** | `sidebar.footer.action` exists. Buildable, but the "516M today" figure has the same data problem as #9 |

### 3.2 Main / detail page

| # | Element in the reference | Verdict | Notes |
|---|---|---|---|
| 11 | Window chrome: minimise / restore / close, Application, Edit | **no** | OS/Electron chrome. See §4.2 |
| 12 | Main as a card, radius 24, padding 24 | **exists** | Bento cards the centre column |
| 13 | "‹ Plugins" as a pill | **CSS** | Host renders `X_2TxG_crumb > Plugins`; restyle to a pill |
| 14 | 12-col grid, gap 16, 7/5 split | **slot + CSS** | `detailSections` is `flex column, gap 32`. Grid takeover is feasible but **untested** — see §5 |
| 15 | Hero: 60px icon, 26px title, version pill, Running pill + dot, mono package name | **exists** | All present in the live detail page. `plugins.detail.badge` for the pill |
| 16 | Hero nested panel: 8px outer pad → 18px inner radius, accent-line border, colored glow | **CSS** | Needs one new token for the colored glow (gate 19 requires a token, not a literal) |
| 17 | Hero description 15px / 1.6 | **CSS** | Host has `detailDesc`; line-height change |
| 18 | Components section + "1 total" + "1 running" pills | **exists** | Host renders `detailSections` → `sectionHead` → `sectionTitle` + `sectionCount` |
| 19 | Component row: 44px icon, name, desc, two mono chips, status pill, switch | **exists** | Host renders every part. Chips + pill are CSS |
| 20 | Source card span 7: "Code source", link pill, path, copy button, divider, version | **exists** | The host has a `SourceSection` component on the package-detail path. Copy-button styling is CSS |
| 21 | **Dark Update tile** span 5: "Update", 40px "v0.1.0", "Check for updates", status line | **slot** | Genuinely new, but `plugins.detail.section` is a free list slot. Buildable as one component |
| 22 | Blue and orange accent pairs | **exists** | Bento already ships 8 accents including blue and amber, each with derived tint + ink |
| 23 | Inter | **exists** | Embedded since D59 |
| 24 | Pill radius 999 on every chip and status | **CSS** | Bento's radius scale has no pill tier; add one |

**Tally:** exists 14 · CSS 6 · slot 3 · no 2 (one of which is really one data problem).

---

## 4. The two that cannot be done

### 4.1 The dark usage tile — the data does not exist

The reference shows real-looking DeepSeek economics: `518M tokens`, `$0`, `Off-peak · 12h 14m left`,
`Peak Thu 09:00`, `Balance ↗`, `516M today`.

Measured on a live instance: the DOM contains **no** token count, balance, or currency figure at all
(`tokens: false`, `balance: false`, `costMatch: []`, `numberWithM: []`). The client plugin API
exposes no usage or billing service, and peak/off-peak is DeepSeek *pricing policy*, not harness
state — nothing in the app models it.

It is not impossible to *build*: three routes exist, none cheap.

| Route | What it needs | Cost |
|---|---|---|
| Read `dsh-cost-meter` | That plugin is installed in the desktop profile and may expose a total | Research its API; may be a private service. Uncertain |
| Derive from session stats | The harness does track per-session token usage (the composer stats strip reads it) | Aggregating across sessions is a real feature, not a theme |
| Host-side counter | The plugin's own host half tallies usage | The plugin currently runs no host work at all (A-contract). A large change |

**Recommendation: drop the tile, or ship it as a static demo with the numbers labelled as such.**
The rest of the reference does not depend on it.

### 4.2 The window chrome — owned by the OS

Minimise / restore / close, with "Application" and "Edit" menus, are the Electron title bar's, and in
the web GUI they do not exist at all. A plugin cannot draw them, and drawing a *fake* set would put
dead buttons in the interface — the exact slop the theme's own rules forbid.

---

## 5. What I did not verify

Stated plainly, because three of these could change a verdict:

1. **That `plugins.detail.section` accepts arbitrary content.** The registry declares it
   `kind: list, scope: root` — the same shape as slots the host itself fills — so this is near
   certain, but I did not mount a component into it.
2. **That a 12-col grid works on `detailSections`.** It is `flex column, gap 32` holding
   host-rendered sections. Applying `display: grid` makes **every** existing child a grid item, so
   the host's Components and Source sections would need spans too. Feasible; not tested.
3. **Whether `dsh-cost-meter` exposes a usage total** to another plugin.
4. Whether the host's `SourceSection` renders for a `link:`-installed plugin or only for package
   entries. The live probe showed it for a bundle detail path, not for the link-installed case.

---

## 6. Recommendation, and its complexity

**Recommendation: restyle first, add two tiles second, drop the usage tile.**

Phase 1 — the value changes. Card radius 20 → 24, nested 16 → 18, add a pill tier, adopt the
reference's 16px gap on the detail board, add `accent-line`, style the breadcrumb as a pill, turn the
session age into a pill. No new DOM, no new slots. **One file for tokens, two for CSS. Every existing
surface keeps working, and the 26 gates still apply.** This is where most of the visual difference
lives.

Phase 2 — the two tiles. A `Source`/`Update` section each mounted via `plugins.detail.section`, plus
the grid CSS to get the 7/5 split. **Two small components, one slot registration each, and one
untested layout step.** Risk is contained: if the grid misbehaves, the tiles still render stacked.

Phase 3 — only if you want it: the signed-in footer via `sidebar.footer.action`, without the token
figure.

**What not to do:** do not build the usage tile. It is the one element in the reference that needs a
data source the harness does not have, and it would mean either a fake number in the product UI or a
feature that is really a usage-analytics project wearing a theme's clothes.
