# Decisions

Append-only. Each entry records what was decided and why. Supersede an entry by
adding a new one; never edit history in place.

Scope: the `dsh-bento-theme` plugin and the working practices around DSH UI
plugins learned while building it. Established 2026-11-03.

---

## D1 — Build the bento theme as a plugin, not a fork

**Decision.** Ship as an installable bundle (`dsh.bundle.patch` + `dsh.client`),
never as a modified application.

**Why.** No source checkout exists on this machine: the install is a packed
`app.asar` with no `packages/` or `apps/`. Nothing needs forking — the plugin
tree composes additively. A fork would also be overwritten by every app update.

**Consequence.** Anything the host does not expose a hook for cannot be changed.
That constraint produced D3.

---

## D2 — One feature registry, stylesheet and settings row per feature

**Decision.** Each visual change is one object pushed into `FEATURES`; the
settings row, storage key, stylesheet block and teardown all derive from it.

**Why.** The first build tried to ship "the whole theme" as one unit. That made a
single defect take the entire plugin down, and it left no way to ship a working
sliver. One feature at a time is the delivery shape the user asked for and it is
also the failure shape that keeps working.

**Consequence.** Adding a feature is one file plus one `FEATURES.push(...)`.

---

## D3 — Reach the shell by runtime stamping, not by selector guessing

**Decision.** Locate the frame's columns structurally once, stamp them with the
plugin's own attribute (`data-dsh-bento-part`), and write every CSS rule against
that attribute.

**Why.** Two facts make the obvious approaches fail (both verified, see
`architecture.md` A2/A3): the host's column wrappers carry CSS-module class names
hashed per build, and `single`/`keyed` slots render no `data-slot` anchor. There
is no stable selector to write. The reference theme (`dsh-claude-style`) does the
same thing with `data-dsh-claude-part`.

**Rejected.** Matching hashed class names — breaks on every app update. Replacing
the frame via the `root` slot — shadows shipped UI and inherits its maintenance.

---

## D4 — Never mutate the Cordis `ctx`

**Decision.** `apply(ctx)` may read `ctx` and register through services, but
never writes a property onto it. Helpers are local variables passed explicitly.

**Why.** `ctx.bentoTranslate = ...` threw during activation. Because it ran before
the try/catch and before the settings row registered, the plugin reported
`failed` and *nothing* appeared — not even an error the user could act on.

**Consequence.** `apply` is fully guarded: every step has its own try/catch and a
failure is logged, never thrown. A broken theme degrades to "no theme", and the
settings row still renders so the user can switch it off.

---

## D5 — Declare surface tokens on `body`, not `html`

**Decision.** Any token that references a host alias (`--dsw-*`) is declared on
`html[data-dsh-bento] body`. Literal values (lengths, durations) may live on `html`.

**Why.** A CSS custom property is substituted on the element that declares it and
does not inherit *upward*. The host defines its aliases on `<body>`, so the same
declaration on `html` resolved against nothing and painted transparent — silently.
This was invisible in source review and obvious in a screenshot.

**Consequence.** See A5 in `architecture.md` for the rule stated generally.

---

## D6 — Observe `document.body` for shell stamping

**Decision.** The stamping observer attaches to `document.body`, not to the root
slot anchor, and stamping is idempotent plus rAF-coalesced.

**Why.** The client half activates *before* the shell renders. `querySelector`
for the root anchor returned null at that moment, so the observer never attached
and no feature was ever applied. The plugin looked loaded and did nothing.

**Consequence.** Stamping self-heals across re-renders without re-tagging an
unchanged tree (which would emit mutations).

---

## D7 — Card geometry is padding and margin, never grid geometry

**Decision.** The gutter is padding on the column and margin on the card; the
frame's `grid-template-columns` is never touched.

**Why.** The drag handles are absolutely positioned at x offsets computed from the
column widths. Changing track geometry desynchronises them and breaks resizing.
This matches what the reference theme does.

---

## D8 — Only host alias tokens for colour

**Decision.** No literal colour anywhere except artwork. Status colour means
exactly one thing; no new shade is introduced.

**Why.** Light, dark and every registered theme then follow automatically, and a
renamed token degrades appearance rather than breaking rendering.

**Consequence recorded honestly:** the generic `bg-layer-*` aliases are all pure
white in this light theme, so a card built from them is white-on-white. The
working pairing recorded at the time was canvas =
`--dsw-specific-sidebar-fill`, card = `--dsw-alias-bg-base`. **Superseded by
D15** — `bg-base` is darker than the canvas in dark mode, so that card reads as a
recess there; the card token is now `bg-layer-2`.

---

## D9 — Verify in a real browser before claiming the theme works

**Decision.** A UI change is not "done" until it has been rendered in a browser and
inspected: computed styles, the injected stylesheet, the settings row, a
screenshot.

**Why.** Every defect in this build (D4, D5, D6 and a backtick that terminated a
template literal) passed source review and pure-logic tests. All four were
obvious the moment the page was rendered. Reasoning about CSS and about host
lifecycle order produced confident, wrong conclusions four times.

---

## D10 — Test in an isolated profile, never the desktop profile

**Decision.** Behavioural tests of a UI plugin run against a throwaway `web`
profile on its own port. The desktop profile is not a test target.

**Why.** The desktop profile is Electron-owned and its recovery path is
destructive: the first failure triggered "disable third-party plugins", which
rewrote `cordis.patch.yml` from 5278 to 1345 bytes and dropped 13 config rows
including nine model definitions. An isolated profile cannot do that.

**Consequence.** Restoring the desktop profile required a byte-compare against the
automatic backup before it could be called repaired.

---

## D11 — A verify gate runs before every install

**Decision.** `node verify.mjs` exits non-zero on any failure. It gates
installation.

**Why.** The first broken bundle reached the user because nothing checked it. A
gate that only ever passes is not a gate, so both failure modes were proved by
planting them: a missing `main`, and a host half that throws on import.

**Consequence.** At the time of writing the gate covered manifest, host-half
import, bundle parse, id matching, patch shape and locales (10 checks). It does
**not** cover browser runtime behaviour, which is why D9 exists separately.
**Extended by D16** to 12 checks, adding the two backtick-hazard gates, and again by D29 to 13 with the fragment-ordering gate.

---

## D12 — Prove every UI change in Chrome against the isolated profile before it touches the app

**Decision.** A UI change is tested in this order, and no step may be skipped:

```
1. author the feature in src/, no install
2. node build.mjs && node --check client.js && node verify.mjs
3. junction the package into profiles/web, add the insert row, start dsh --profile web
4. drive headless Chrome: stamp count, injected CSS, computed styles, screenshot
5. measure every claim numerically (contrast, box geometry, wrap state)
6. fix and repeat from 2 until the rendered measurements are right
7. tear the test rig down and confirm the web profile is byte-identical to before
8. only then rebuild for the desktop profile and tell the user to reload
```

**Why.** A UI defect cannot be found by reading CSS or by reasoning about the
host's lifecycle — this project has produced four confident wrong diagnoses
(L2) and three defects that each passed source review and pure-logic tests. The
isolated profile exists because the desktop recovery path is destructive and has
already rewritten the user's config once (L1, D10). Testing in Chrome costs
minutes; being wrong in the desktop app cost an outage and 13 config rows.

**Consequence.** Every claim about appearance in these docs is backed by a number
read from a rendered page or from the screenshot's own pixels, never by an
inspection of the source. Where a claim is not measured, it says so.

**Also decided:** the test rig is torn down and the web profile restored to
byte-identical after every run, so a stale junction or patch row cannot silently
change what a later session is testing.

---

## D13 — Reach the Settings panel by containment, not by class name

**Decision.** The Settings redesign targets the panel through
`[data-shortcut-modal="settings"]` and identifies the content column with
`:has([data-slot="settings.section"])`. Preference rows are reached through
`[data-slot="settings.general.item"] > *`. No rule names a CSS-module class.

**Why.** Measured, not assumed:

- The panel is the only element carrying `data-shortcut-modal="settings"` (one
  match on the live page), and it is a host-written semantic attribute.
- The nav's selected cell exposes `aria-current="true"` — a real semantic hook.
- But every row class is a per-component hash (`oY77xG_row`, `hVGvvW_row`,
  `_8XZxNq_row`, `Pt1bsG_row`, …). A new section brings a new hash, so a class
  based rule covers one section and breaks on the next. The General section alone
  contains 8 distinct row classes.
- `settings.general.item` is a list slot, so its children are the rows; that
  anchor is stable and already load-bearing for the plugin's own toggles.

**Rejected.** Selecting the content column by hashed class (`VOzbGW_content`) —
breaks on the next build. Selecting rows by `:has(role="switch")` — misses every
row whose control is a select, a stepper or a button.

---

## D14 — A card costs no layout width in a dialog the host has already sized

**Decision.** The Settings content card is painted on a positioned
pseudo-element (`::before`, `z-index: -1`), never with a margin, padding or
border on the column itself.

**Why.** The first implementation inset the column with `margin: 8px`. Measured
result: the content column went from 612px to 596px, and the host's Appearance
control — three cubes at `flex: 1 1 180px` in a `flex-wrap: wrap` row — needed
3×180 + 2×8 = 556px inside a 564px row. The row dropped to 546px, so "System"
wrapped onto a line of its own. The regression was invisible in the CSS and
obvious in the screenshot. Painting on a pseudo-element keeps every host-solved
box at its original size, so no control can reflow.

**Consequence.** This is the general rule for this plugin: **paint, do not
resize.** A theme may add surfaces and spacing, but a change that narrows a
host-solved box can reflow a control the host tuned to fit exactly. It applies to
the sidebar columns as much as to the dialog.

---

## D15 — The raised surface is `--dsw-alias-bg-layer-2`, not `bg-base`

**Decision.** `--dsh-bento-card` resolves to `--dsw-alias-bg-layer-2`.

**Why.** Measured in both themes:

| token | light | dark | reads as |
|---|---|---|---|
| canvas (`sidebar-fill`) | `#f9fafb` | `#1b1b1c` | backdrop |
| `bg-base` | `#fff` | `#151517` | lighter in light, **darker in dark** |
| `bg-layer-2` | `#fff` | `#2c2c2e` | lighter than the canvas in **both** |

`bg-base` is *below* the canvas in dark mode, so a card built from it renders as a
recess — the layering inverts and the design reads wrong in exactly the theme a
user chooses for comfort. `bg-layer-2` is the token the host itself paints the
Settings panel with, so it is the host's own idea of an elevated surface.

**Consequence.** Supersedes the colour note in D8. The lesson generalises: a
surface token must be verified in **both** themes, because a token that is
"white" in light mode is not necessarily "lighter" in dark mode.

---

## D16 — Backtick hazards are gated by measuring the built bundle, not the source

**Decision.** `verify.mjs` checks two things about the backtick hazard: that no
CSS comment contains a backtick, and that every `*_CSS` template literal in the
built `client.js` has balanced braces and ends on a closing rule.

**Why.** The first gate I wrote grepped source comments and flagged legitimate
backticks in JSDoc — a false positive that failed on a clean tree, so it would
have been disabled by the next person. The second attempt scanned inside template
literals and passed a planted violation, because a stray backtick in a CSS *comment*
often leaves the file as **valid JavaScript**: the remainder becomes an identifier
expression and the next backtick opens a fresh literal. `node --check` therefore
passes while the stylesheet is silently truncated.

**Consequence.** The check had to move to the artefact. Both gates were proved by
planting a violation and watching them go red with the cause named
(`backtick in CSS comment at 15-tokens.js:29`, `literal at line 52: 2 { vs 1 }`).
This is D11's rule applied to itself: a gate never seen red is not known to work.

---

## D17 — Adopt the cool blue-grey canvas, and take its value from a host token

**Decision.** The bento canvas is a cool blue-grey rather than the host's neutral
`#f9fafb`, sourced from the host's own selected-row token:

| Mode | Token | Resolves to | Canvas : card |
|---|---|---|---|
| light | `--dsw-specific-sidebar-nav-item-active` | `#ebeef2` | **1.164** |
| dark | `--dsw-specific-sidebar-fill` | `#1b1b1c` | **1.235** |

Dark uses a **different token**, not the same one, and that is the point of the
entry.

**Why.** The reference design that prompted this (`RSI Paid Marketing – Bento`)
uses `#EDF0F4`, which is within **3.5 RGB units** of `#ebeef2`, and it lifts the
card off its backdrop from a bare 1.045 to a visible 1.164. Taking the host token
rather than the literal hex keeps the theme following light/dark instead of
freezing one palette.

The dark case is the trap: `--dsw-specific-sidebar-nav-item-active` is `#43454a`
in dark, which is **lighter than the `#2c2c2e` card**, so the layering inverts and
the card reads as a recess. `--dsw-specific-sidebar-fill` is `#1b1b1c` and sits
correctly below the card. Same visual role, opposite token, per theme.

**Consequence.** This is the third time in this project that a surface token
looked right in light mode and inverted in dark (D15, L13, and now this). The rule
that follows: **a surface token is not chosen until its value has been read in
both themes.**

---

## D18 — The gutter is 12px because 14 breaks the sidebar

**Decision.** `--dsh-bento-gutter` is 12px, not the reference's 16px.

**Why.** Measured against the live shell:

| Gutter | Rows overflowing the column |
|---|---|
| 8px (before) | 0 / 13 |
| 10px | 0 / 13 |
| **12px** | **0 / 13** |
| 14px | **13 / 13** (worst 2px over) |
| 16px | 13 / 13 (worst 4px over) |

The reference's 16px gap is not available: our sidebar column is 280px, not the
660px a dashboard card gets. At 14px every session row spills past the column edge.

**Consequence.** Card radius is scaled down with it — 20/14 instead of the
reference's 24/18 — because a smaller card with a 24px radius reads as a pill.
The reference's proportions apply here only after its *absolute* values are
dropped.

---

## D19 — Pass 1 shipped tokens only, and that was the correct size

**Decision.** The redesign is delivered in passes, and pass 1 changed nothing but
token values plus one frame background rule.

**Why.** Pass 1 was verified to do exactly three things and no more: canvas
`#ebeef2`, gutter 8→12, radii 14/10→20/14, with session row radius propagating to
14px and 0 of 13 rows overflowing. Zero console errors in both themes.

It also demonstrated *why* the work needs passes: with tokens alone the canvas is
visible only as a 12px ring, because the host's own content roots still paint over
the cards (verified in the screenshot's pixels — the interior is `#f9fafb` and
`#ffffff`, not our card). Pass 1 therefore improves contrast without yet changing
the composition, which is a real, shippable, low-risk improvement and a clean
checkpoint.

**Consequence.** Pass 2 (uncovering the sidebar card) is where the visible change
lands. Keeping them separate means a defect in the card-reveal cannot be confused
with a defect in the palette.

---

## D20 — Reach the host's content root structurally, not by class name

**Decision.** The sidebar feature clears the host root's fill with
`[data-dsh-bento-part="sidebar"] > * > *`, not with `[class*="_root"]`.

**Why.** The column's direct child is the `display: contents` slot anchor, which
has no box. The child of that anchor is therefore *exactly* the element the column
lays out — the host's content root — with no class name required. Measured: one
element, `hHd-Xa_root hHd-Xa_quietBars`.

This supersedes the sketch in L20, which proposed `[class*="_root"]`. That works
but is a class-fragment guess; the structural selector is not a guess at all and
survives a rename of the class. It also cannot accidentally match a nested
`_root` deeper in the tree, which the fragment selector does: the broad version
matched **25 elements** in the sidebar, the structural version matches one.

**Consequence.** No hash, no fragment, no guess. If the host ever inserts a
wrapper between the anchor and the root, the rule stops matching and the card
reverts to being covered — a cosmetic, self-isolating failure (L20's criterion).

---

## D21 — The card is revealed by clearing paint, not by recolouring it

**Decision.** Pass 2 makes the card visible by setting the host root's background
to transparent and clamping it with `max-width: 100%`. It does not raise the
card's contrast, add a shadow, or change the card colour.

**Why.** The card was never faint — it was **covered** by an opaque
`border-radius: 0` rectangle (A9, L18). Two sessions were spent adjusting a
colour that was painted over. Measured after the fix, in both themes:

| | Before pass 2 | After |
|---|---|---|
| pixel at x=150, y=450 (light) | `rgb(249,250,251)` host fill | `rgb(255,255,255)` **our card** |
| pixel at x=150, y=450 (dark) | `rgb(27,27,28)` host fill | `rgb(44,44,46)` **our card** |
| root width | 280px in a 264px box | 256px, matches the card |
| content spilling past card edge | 16px | 0 |

The `max-width: 100%` is not cosmetic: without it the root stays 280px inside a
256px box and the overflow squares off the card's rounded corner.

**Consequence.** The canvas finally reads as a canvas, because 24px of it is now
visible on both sides of the card rather than a fractional ring.

---

## D22 — Pass 2 is scoped to the sidebar only

**Decision.** Pass 2 changed one feature file. The centre column is still not
carded; that is pass 3.

**Why.** The sidebar card-reveal is a self-contained, verifiable change: it makes
the existing card visible without touching the conversation column. Splitting it
from the centre-column work means a defect in one cannot be confused with the
other, and each pass ships independently.

**Consequence.** After pass 2 the sidebar is a card on the cool canvas, and the
centre column is still a flat white panel. That asymmetry is expected mid-sequence,
not a bug — the next pass closes it.

---

## D23 — The redesign lands in four passes, in this order

**Decision.** The reference-inspired redesign is sequenced as:

| Pass | Scope | State |
|---|---|---|
| 1 | canvas, gutter, radii (tokens only) | **shipped** |
| 2 | reveal the sidebar card (clear the host root's paint) | **shipped** |
| 3 | card the conversation column + recessed composer | **shipped** |
| 4 | move the plugin's rows to their own Settings tab | **shipped** |

**Why this order.** Each pass is independently verifiable and independently
shippable, and each one touches a different mechanism:

1. token values — no layout rules at all
2. paint order inside one column
3. a second column plus one nested surface
4. the Settings slot tree (not CSS at all)

Ordering by *mechanism* rather than by visual size is what makes a failure
attributable. Pass 1 and pass 2 both shipped without any doubt about which change
caused what, which would not have been true if the canvas and the card-reveal had
landed together.

**Consequence.** Pass 4 is last because it is the only pass that changes where a
user's configuration *lives*, and the only one that is not CSS. It should land on
top of a settled design, not ahead of one.

---

## D24 — The plugin gets its own Settings tab, and General keeps none of its rows

**Decision.** Pass 4 registers a section on the `settings.section` list slot and
moves all three feature toggles into it. Settings › General loses them entirely.

**Why.** Three toggles that exist only to switch parts of one theme on and off are
that theme's configuration, not general application settings. They currently sit
between the host's own Appearance/Font-size controls and its Developer tools,
which is where a user does not expect to find them.

**Feasibility is proven, not assumed.** `settings.section` is a list slot and the
host registers its own General tab into it with
`{ name, id, order, label, children: { 'settings.general.item': {...} } }`. An
**installed** package on this machine — `dsh-skills-doctor` — already registers a
third-party tab the same way:

```js
ctx.slots.inject('settings.section', () =>
  ctx.slots.register(
    { name: 'settings.section', id: 'skills-doctor', order: 40,
      label: () => 'Skills Doctor', icon: 'skill' },
    SkillsDoctorPanel,
  ),
)
```

So this is a supported extension point with a working precedent here, not a
speculative hack.

**Consequence, stated honestly.** The nav glyph comes from a hard-coded map keyed
on section id (`function navIcon(id)`); unknown ids fall back to the settings
gear, and the `icon` member in the registration is ignored for a third-party id.
A bespoke icon would require injecting a row element into the host's nav list,
which is not exposed. The realistic result is **the gear glyph**, and that is
acceptable — inventing an unsupported DOM injection to get a different icon is not
worth the fragility.

Stored choices are keyed by feature id, not by tab, so users' existing
preferences carry over unchanged.

---

## D25 — Pass 4 relocates the registration; it does not duplicate it

**Decision.** Moving the toggles means re-registering them into the plugin's own
section and **removing** the `settings.general.item` registration, in one change.

**Why.** Registering in both places would give a user two switches for one
setting. That is a representable-illegal-state defect: the two copies can
disagree in the UI while the underlying value is single. The developer-rules design
pass calls this out explicitly, and it applies here.

**Consequence.** After pass 4, `settings.general.item` is no longer used by this
plugin at all, and the Settings board CSS that targets those rows needs re-checking
against the new section's rows.

---

## D26 — The centre column has TWO anchor levels, so its root is found by attribute, not by depth

**Decision.** The conversation card clears the host root with
`> * > *:not([data-slot]), > * > * > *:not([data-slot])` — matching one *or* two
levels of `display: contents` anchor, and skipping anything that carries a
`data-slot` attribute.

**Why.** The sidebar and the conversation column do **not** have the same shape:

```
sidebar:                              centre:
div[part=sidebar]                     div[part=center]
 └─ div[slot="sidebar"]  contents      └─ div[slot="main"]               contents
     └─ div.hHd-Xa_root                   └─ div[slot="main.conversation"] contents
                                             └─ div.wSkVaW_root
```

The sidebar rule `> * > *` therefore lands on the real root there, but on a
**second zero-width anchor** here. I copied the sidebar rule into pass 3, it
matched a 0×0 element, the root stayed opaque, and the card was invisible — while
every computed-style read on the card itself looked correct. Exactly the failure
mode of L18, reproduced by copying instead of measuring.

Anchors are the only elements under a column carrying `data-slot`, and the root
never carries one, so `:not([data-slot])` skips an anchor at any level. That
makes the rule tolerant of a shape change rather than pinned to a DOM depth.

**Consequence.** The two features no longer share a selector helper, because the
two columns do not share a shape. That is honest: a shared helper would have to
know about both depths anyway.

---

## D27 — The composer takes a tone; it does not take a border

**Decision.** On the white card the composer is painted with the canvas tone and a
hairline drawn as an **inset box-shadow**, never a border.

**Why.** Two separate measured reasons:

1. **It is invisible otherwise.** The host paints the composer `#ffffff` — the
   same as the card it now sits on. Measured contrast composer:card = **1.0**.
   Canvas tone brings it to **1.164** light / **1.235** dark, i.e. exactly the
   canvas:card ratio, so the composer reads as part of the same tonal system
   rather than as a new colour.
2. **A border would move it.** A 1px border adds 2px to the control's box. This
   project has already reflowed one host-sized control by nudging its box (D14,
   the Settings Appearance cubes). An inset shadow paints the same hairline and
   costs zero layout. Verified: composer still 759×114 with `border-width: 0`.

**Consequence.** The composer is the reference design's nested-panel move — card,
then a tonal panel inside it — implemented without touching a single host box.

---

## D28 — Pass 3 measured with a live session, and reported one pre-existing failure

**Decision.** Pass 3 was verified not only on the empty hero screen but with a real
session opened from the sidebar.

**Why.** The conversation column is the one region whose content is not known in
advance, so the empty state proves the least. With a session open: card 1160px →
1134px painted, radius 20px, **0 elements spilling past the rounded edge**, no
horizontal scroll (1160/1160), composer still inside the card, zero console
errors.

**Recorded honestly:** opening a session in the isolated test instance shows
*"Failed to load history: ... contains event type 'job/registered' ... unknown to
this harness"*. That is a **session-log version mismatch** — the log was written by
a newer harness than the one running — and it is unrelated to this theme: it
renders in the host's own error style inside the host's own content area, and it
reproduces without the plugin. It is noted so a future session does not mistake it
for a pass 3 regression.

**Consequence.** The card was verified against real session chrome (header, tab
row, composer, status bar), which is the part of the layout most likely to break.
Actual message content from a *loadable* session has not been exercised here.

---

## D29 — Module-scope constants live in the prelude, and a gate enforces it

**Decision.** Any constant read at module scope by a fragment goes in
`00-prelude.js`. `verify.mjs` now fails the build if a fragment reads a
module-scope identifier declared by a later-numbered fragment.

**Why.** Pass 4 declared `ROW_ATTR` in `60-settings.js` and used it in
`50-feature-settings.js`. Fragments are concatenated in filename order and share
one scope, and 50 builds its stylesheet string **at module scope**, so the read
happened before the declaration was initialised:

```
web boot: 1 entry did not activate
dsh-bento-theme: import failed: Cannot access 'ROW_ATTR' before initialization
```

That is an **import-time** throw, which is the most expensive failure shape in
this project: it takes the whole application's boot down and reports the plugin as
failed rather than as a missing feature (D4, L3).

**Consequence.** The check is static, deliberately: an import-time error is only
caught by a browser test if the plugin happens to be installed in the instance
under test, and the point is to catch it *before* an install. It was proved by
planting the exact bug and watching it name the file
(`50-feature-settings.js reads ROW_ATTR (declared in 60-settings.js)`).

The first version of the check matched function-local variables too and produced
twelve false positives on a clean tree (`frame`, `roles`, `title`). Narrowing it
to declarations at exactly four spaces — the fragments' module-scope indent —
fixed that. A gate that cries wolf gets deleted, so this mattered.

---

## D30 — The plugin owns a Settings tab, and General keeps none of its rows

**Decision.** `settings.section` carries a `bento-theme` tab at order 30. General
no longer shows any row from this plugin.

**Why.** Proven in the running app: the nav renders
`General | Models | Built-in plugins | Agent presets | Bento layout | Remote Access`,
and General reports **0** rows carrying this plugin's marker while the new tab
reports **4** (`sidebar-card`, `row-tiles`, `center-card`, `settings-bento`).
Toggling one writes `dsh-bento-theme:enabled:sidebar-card` to localStorage, so
existing saved choices carry over untouched.

The old `settings.general.item` registration is gone, not shadowed — a setting
with two switches is a state the UI should not be able to represent (D25).

---

## D31 — A plugin section must supply its own top offset

**Decision.** The panel body carries `paddingTop: 20` and a flex wrapper; nothing
else.

**Why.** The host renders sections into an options area with
`padding: 0 24px 24px` — **no top padding**. The host's own sections never notice
because each opens with a title or intro block that supplies the visual offset. A
plugin section has no such block, so its first row landed at **y=104**, exactly the
top of the options box, flush against the card edge. With the offset it sits at
y=124.

The equivalent horizontal bug was found first: returning a bare fragment made rows
direct children of the padding box at x=520 where the host's sections start at
x=532. The wrapper fixed the width (564px, matching the host); the vertical offset
needed its own treatment.

**Consequence.** This is the general shape of the problem for any plugin section:
**the host's section chrome is supplied by the host's section content, not by the
container.** A plugin that renders into the same container inherits the container
but not the chrome, and must supply the difference itself.

---

## D32 — The row's horizontal padding belongs to the stylesheet, not the element

**Decision.** `FeatureRow` sets `paddingBlock: 16` inline and leaves horizontal
padding entirely to the board stylesheet.

**Why.** The board paints a row's hover fill with a negative inline margin and
gives the inset back as padding:

```css
[data-dsh-bento-row] {
  margin-inline: calc(-1 * var(--dsh-bento-gutter));
  padding-inline: var(--dsh-bento-gutter);
}
```

The row also carried an inline `padding: '16px 0'`. **Inline styles beat
stylesheet declarations**, so the shorthand reset `padding-inline` to zero: the
negative margin pulled the row out to the card's edge and nothing pulled the text
back. Measured `cardToText = 0` — the label sat exactly on the card's left border,
which is what the user saw.

With `paddingBlock` the two declarations stop competing: the element owns the
vertical rhythm, the stylesheet owns the horizontal inset.

**Verified at the reported window size (803×805):**

| Measure | Before | After |
|---|---|---|
| card left edge | x=224 | x=224 |
| label left edge | **x=224** (flush) | **x=236** |
| card-to-label gap | **0px** | **12px** |
| row top hairline | 1px visible | 0 |
| hover fill | — | full card width, text still inset |

**Consequence.** The general rule for this plugin: **when a stylesheet and an
element both want to control one side of the same box, the element's inline style
always wins — so the two must be split by axis (block vs inline), not by trusting
one to override the other.**

---

## D33 — Lifting content and clearing a background are two different rules

**Decision.** The centre column has **two** rules, not one:

| Rule | Selector | Scope |
|---|---|---|
| **lift** content above the card | `> * > *:not([data-slot])`, depth-tolerant | every page in the column |
| **clear** the root's opaque fill | under `[data-slot="main"] [data-slot="main.conversation"]` | the conversation only |

**Why.** The card is an absolutely positioned pseudo-element, so by default it
paints **above** static in-flow content. Getting text to appear at all requires
lifting whatever the column lays out — and that applies to every page, not just
the chat.

Scoping both concerns to the conversation is exactly what I did first, and it
**deleted the Plugins page's text**: the page's rows stayed transparent and
unlifted, so only its positioned switches survived above the card. The screenshot
showed a blank page with floating toggles.

So the two have opposite scopes: the lift must be broad, the clear must be narrow.

**Consequence.** Measured after the split: the clear rule matches **2** elements on
the conversation (`wSkVaW_root`, `wSkVaW_body`) and **0** on the Plugins page,
while the lift keeps all 1517 characters of page text visible.

---

## D34 — The centre root-clear rule is scoped by location, not by depth

**Decision.** The clear rule keys on the host's conversation anchors —
`[data-slot="main"] [data-slot="main.conversation"]` — instead of "two or three
levels under the column that is not an anchor".

**Why.** The old selector was really "whatever is in the centre column". Measured
on the Plugins page it matched **4** elements (`page`, `pageHead`, `group`,
`group`) versus **1** on the conversation. Those four were harmless only because
they happened to be transparent already — a page that painted its own background
would have been silently erased by a rule that never mentioned it.

The conversation anchors are the host's own semantic marker for "this is the
conversation slot", and they are the reason a page can be distinguished at all: a
page mounts under a different anchor.

**Consequence.** Zero hits on the Plugins page, two on the conversation, card
unchanged in both cases.

---

## D35 — Page rows get the tile language, and nothing else

**Decision.** `page-rows` styles the row elements of full pages mounted in the
conversation column — `section ul > li` — with the theme's inner radius and the
pointer fill. It does not touch the page's typography, toolbar, badges or switches.

**Why.** Those pages previously inherited the card but none of its language: every
row was a flat transparent strip, so a page read as host UI dropped into a bento
frame. The rows are the one part where the theme can add value without guessing:
measured 13 rows, all rounded 20px already by the host, with a 2px gap — they
wanted a surface, not a redesign.

The selectors are `section ul > li` and `h3` — element semantics, not the hashed
class names (`X_2TxG_card`) the page actually uses. A hashed name would break on
the next build; element structure inside a page root is stable enough, and the
failure mode if it changes is cosmetic.

**Deliberately not done.** Restyling the page's text, badges and switches would be
guesswork on a dense surface the host tuned. The rule here is the same as
everywhere else in this theme: **give the host's content the theme's surfaces,
never its opinions about content it did not design.**

**Verified:** 13 rows at 14px radius, hover fills exactly one
(`rgba(38,49,72,0.06)`), 1517 characters of text intact, 9 switches untouched,
zero console errors.

---

## D36 — The sidebar has one row style, not two

**Decision.** `row-tiles` styles the sidebar's top-level destinations
(Plugins, MCP connectors) with the same radius and hover edge as the session tiles.

**Why.** The column stacked two row treatments: destinations at the host's 12px
with no edge, sessions at 14px with one. Measured before:

| Row | Radius | Border | Height |
|---|---|---|---|
| nav row | 12px | none | 36px |
| session row | 14px | 1px | 34px |

Addressed as `[class*="panelList"] > button` — proven to match **exactly 2**
elements and nothing else in the sidebar. A plain
`[data-dsh-bento-part="sidebar"] button` would have matched **36**, hitting the
brand, the collapse toggle, the New Session button and the Settings trigger.

The border is declared transparent rather than added on hover: a 1px addition
would change the button's box and shift every row below it.

---

## D37 — The right panel needed four anchors and two clears

**Decision.** `rightbar-card` clears the panel root through
`[data-slot] > *:not([data-slot])` and additionally clears the `_tabHost` pane.

**Why.** Two separate obstacles, both measured:

1. **Four nested `display: contents` anchors**, one per slot level, put the panel
   root at depth 5 — so a depth-based rule could never reach it. Anchors carry
   `data-slot` and the root does not, which makes the attribute the discriminator
   rather than a count.
2. **The root is not the last thing painting.** A `_tabHost` element inside it
   paints opaque white across the whole pane. Clearing only the root left the card
   visible as a thin edge: card at x 892..1588, pane painting white over all of it.

**Also recorded:** an earlier statement in this project that the right panel's card
CSS was "written but never rendered" was **wrong**. There was no such CSS — the
`rightbar` part name existed and was stamped, but no feature addressed it. The
column measured 0px wide because it is collapsed by default, and that was read as
"written but unverified" when the truthful status was "not written".

**Verified open, both themes:** card 696px in a 720px column, 0 elements spilling,
8 entries / 6 buttons / 137 text characters intact. Collapsed: the grid track stays
0px and the column sits off-screen at x=1600, so the centre keeps its full 1320px.

---

## D38 — Menus are reachable and deliberately left alone

**Decision.** No feature styles menus, popovers, model/workspace pickers or the
command palette.

**Why.** They are already composed on the same principles this theme uses, measured:

| Property | Value |
|---|---|
| portal | `body`, outside the shell |
| outer | 16px radius, 4px padding, shadow |
| cells | 12px radius, `0 8px` padding, 34px tall, 13px/20px |
| surface | a `_material` layer painting the tone |

Restyling a surface that already works, to make it look touched, is change for its
own sake — and this is the one layer where a broad body-level selector would have no
scoping and no ownership.

**Two corrections, both stated wrong during the survey:**

1. I first reported menus as **unreachable**. They are not: they sit on `body` and
   the root attribute is on `html`, so `html[data-dsh-bento] [role="menu"]`
   matches. The accurate statement is "reachable, and deliberately not touched".
2. I nearly changed the Settings nav tile from 14px to 10px on a rationalisation
   about "rail geometry". The host's own nav cell measures **exactly 14px**, which
   our `--dsh-bento-radius-inner` already is. The change would have made it worse.

**Recorded scale**, ours against the host's:

| Surface | Outer | Cell |
|---|---|---|
| menus | 16px | 12px |
| settings panel | 28px | 14px (matches host exactly) |
| bento cards | 20px | 14px |

---

## D39 — What the bento language audit is for, and what it is not

**Decision.** A convention audit is a separate workstream from a feature pass. It
produces a written inventory with tiers (P0/P1/P2) and **does not change code in the
same change**. Findings live in `docs/research/bento-language-audit.md`; anything that
becomes work gets its own decision entry and its own commit.

**Why.** A pass starts from "restyle this surface" and ends at a verified render. An
audit starts from "what does this style actually require" and ends at a list. Merging
them would mean the list is shaped by whatever happened to be easy to fix, which is
how a real gap gets dropped for a photogenic one. Keeping the audit read-only also
means it can be wrong out loud — three of its first findings were wrong (§4 below) and
correcting them cost nothing because no code depended on them.

**What it found, in one line.** Six features, zero defects, three inert declarations,
no type scale, no responsive rules, no focus parity, no forced-colors story, and a
spacing ratio inverted against the idiom it borrows.

---

## D40 — The reference is a shadowless, border-plus-fill system, and the theme matches it

**Decision.** Keep elevation at zero. Separation is a 1px edge plus a fill step
(1.164 light / 1.235 dark); shadow is never used for depth. Any future feature that
wants to "add polish" by raising a card's shadow is wrong.

**Why.** Aggregated over the 12 extracted reference pages: **86 of 86 cards carry
`box-shadow: none`**, 83 of 86 share `24px` radius, 68 of 86 share `20px` padding.
The look is Vercel's shadow-as-border school, not Material elevation.

This also settles a claim I would have got backwards from the screenshots. The bento
aesthetic is described as soft and elevated; the reference gets its softness from a
**1.143 contrast step and a hairline**, and its hierarchy from font **weight**
(400 / 600 / 700), not from surface. Recorded because "add a subtle shadow" is the
first thing a future session will want to do and it would break the system.

**Corollary for contrast tooling.** Card surfaces are painted on `::after`, so they
are not ancestors of their content. A DOM-walking contrast check reports the canvas
for text that sits on the card: measured 4.98 for text whose true ratio is 5.80. The
pixel, or a hardcoded backdrop, is the only honest source here.

---

## D41 — The theme takes bento's surface and refuses bento's layout, deliberately

**Decision.** No feature may reflow a column, change a grid track, vary cell sizes, or
introduce an anchor cell. The host solves the layout; the theme paints on it.

**Why.** Bento's documented failure modes are all layout failures — it needs every
cell filled, it degrades under resizing, and it destroys reading order, which is why
the pattern is recommended for presentations and marketing rather than working
applications. None of those are reachable here because no cell is ever re-flowed. The
three columns, their widths, the drag handles and the collapse behaviour are all the
host's.

**The honest cost of that choice**, stated so it is not mistaken for a win: the theme
has the bento *surface* and none of the bento *composition*. Measured, the outer
margin is 12px against a 24px inter-card gap — ratio **0.5**, where the idiom wants
the outer margin larger. The cards sit closer to the window edge than to each other.
That is the app three-pane idiom (VS Code, Slack), not the tray. It reads as "panels in
a window wearing card styling" rather than "a tray", and it cannot be fixed without
padding the frame, which carries an inline `grid-template-columns` and would compress
every column and move every drag handle.

Recorded as a known limit rather than a defect, because the alternative is worse.

---

## D42 — Zero width breakpoints is the host's call, not ours

**Decision.** No `@media (min-width …)` / `max-width` rules. The theme inherits the
host's reflow and contributes only tokens that survive it.

**Why, measured.** At 1600 / 1280 / 1100 / 960 / 820 / 700: zero horizontal document
scroll, zero clipped sidebar rows, composer intact, and the host's own sidebar collapse
(56px rail at ≤960) picks up our rail tokens — 4px gutter, 10px radius, verified
applied. The theme's contribution at narrow widths is that it degrades, not that it
adapts.

The one convention this leaves unowned is "reflow, do not shrink". The theme neither
implements it nor claims to. That is defensible — a radius and a gutter are a token
system, breakpoints belong to whoever owns the grid — but it is a gap, not a design.

---

## D43 — Motion resolves through the token first, then the OS preference, then the value

**Decision.** Every animated property in this plugin takes its duration from
`var(--dsh-bento-motion, <fallback>)`, where the fallback is computed at render from
`prefers-reduced-motion`. A literal duration in a transition is a gate failure
(check 14). The easing follows the same rule through `--dsh-bento-ease`.

**Why, and why the simpler fix was wrong.** The audit's P1.1 reported that the plugin's
own Settings switch ignored reduced motion, because its transitions were inline and no
media query can reach an inline style. The obvious fix — move them onto the
stylesheet — does not work here:

**That switch is what turns the theme on.** With every feature off, the stylesheet is
never injected. A transition declared only there would leave the control dead in exactly
the state where the user opens Settings to turn something on. The suggested fix would
have traded an accessibility bug for a broken control.

The three-step resolution fixes both: the token when the theme is on (which is what the
media query reaches, and what keeps motion retunable in one place), the `matchMedia` read
when it is off (which is what makes the control independent of the theme), then 160ms.
Verified in all four combinations of preference and theme state; the two theme-off cases
are the ones that prove the control does not depend on the stylesheet it configures.

**Accepted limitation.** The query is read at render, not subscribed. A preference
changed while the Settings panel is already open is picked up on the next render, not
instantly. Recorded rather than fixed: the alternative is a second subscription
mechanism in a component that otherwise holds no state, for a setting that changes
approximately never.

**What the gate can and cannot see.** It is a source scan, so a duration assembled from
two variables at runtime would pass it. It is a floor, not a proof — and it was proved
red against three plants (a `160ms` literal, a `0.16s` literal, and a literal inside a
CSS template literal in a different fragment) before it was trusted.

---

## D44 — Keyboard focus is the host's ring plus our fill; `:has(:focus-visible)`, never `:focus-within`

**Decision.** Wherever this theme gives a row a pointer fill, it gives the same fill to
keyboard focus, via `:has(:focus-visible)`. The focus *ring* is the host's and is never
re-drawn. Where a feature changes a row's radius, it also sets the radius of the host's
ring pseudo-element, so the two curves match.

**Why the fill and not the ring.** The host already draws an excellent indicator: a 2px
brand-coloured ring on the focused control's `::after`, absolutely positioned at
`inset: 0`, whose containing block resolves to the row. Adding our own ring would double
it. What was missing was the *fill* — hover indicated the row, keyboard focus indicated
only the 36x20 switch inside it.

**Why not `:focus-within`.** It also matches after a mouse click on a switch, so the row
would keep the hover tone after the pointer left. A fill that persists when focus is no
longer visible is a stuck highlight, not an indicator. `:has(:focus-visible)` restricts
it to keyboard navigation. Verified by clicking a switch, moving the pointer away, and
asserting the row computes transparent — `:focus-within` fails that test.

**Why the radius has to be set explicitly.** The host draws its ring at the card radius
(`20px`); this theme's row tiles are `14px`. The ring therefore arcs wider than the
surface it outlines and both curves separate at all four corners. `border-radius:
inherit` does not help — the pseudo inherits from the button, a zero-radius
content-sized box, not from the row. The rule is scoped to
`li *:focus-visible::after` and was verified to be inert on every other pseudo-element
in a row (all compute `content: none`).

**Correction to the audit.** P1.2 reported that keyboard users saw "nothing" on the
Plugins page. That was false: the ring exists and spans the row. The report came from
reading the control's own `outline` and never looking at its pseudo-elements. The
genuine defects were the radius mismatch and the pointer-only fill, both caused by this
theme — neither visible from the stylesheet.

**Accepted cost.** The theme now owns one property of a host pseudo-element. A future
host build that changes what `::after` paints on a page control would be affected; the
row's own radius would then disagree in a different way. The rule is deliberately
narrow (focus-visible, inside a page row, inside the centre column) so the blast radius
is one property on one pseudo in one context.