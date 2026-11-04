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

> **Partially superseded by D45.** The menu decision stands. The measurement in
> correction 2 below — "the host's own nav cell measures exactly 14px" — was taken
> with the theme active and read this theme's own declaration back. The host draws
> that cell at **12px**. The conclusion drawn from it ("14px is already right, keep
> it") was therefore backwards, and the inner tier is now 12px. Kept as written
> because the record of how the error was made is the useful part.

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
---

## D45 — The inner radius tier is the host's own 12px, not 14px (supersedes D38's measurement)

**Decision.** `--dsh-bento-radius-inner` is **12px**, the host's `--dsw-radius-md`.
D38 recorded "the host's own nav cell measures exactly 14px, which our
`--dsh-bento-radius-inner` already is" and used that to keep 14px. **That measurement
was wrong** and this entry supersedes it.

**What the measurement actually is.** With the whole plugin disabled — every feature
off, no stylesheet injected — the host draws all four row types in the sidebar at
**12px**: New Session, nav destinations, workspace headings, session rows. With
row-tiles on, two of those become 14px, and they are the two this theme overrides. So
D38 compared the theme against itself.

**Why 12px and not the concentric answer of 6–8px.** Concentric maths (inner = outer
minus padding, floored at 4) would give 6–8px at this inset under a 20px card. It is
deliberately not followed: the purpose of this tier is to agree with the rows the host
already draws in this column. Out-deriving the host would leave every row this theme
does not touch at 12 while the ones it does touch sit at 6 — tidier arithmetic,
visibly worse result.

**Why 14px was the worse choice independently.** The host's radius scale is
8 / 12 / 16 / 20 (`--dsw-radius-sm` through `-xl`). 14px was the only radius in this
theme not on it. It also ran the column at two radii simultaneously, because the theme
overrode two rows and left two alone.

**What changed.** One token, eight call sites, no per-feature edits. Verified: all four
sidebar rows compute 12px in both themes; card stays 20; page rows and Settings rows
follow the same token and are consistent.

**The recurring lesson, now three times in this project** (D38, L35, and here): a
measurement of "what the host does" taken with the theme active is not a measurement of
the host. Disable the theme first. `p2-host-radii.cjs` is the harness that does it.

---

## D46 — High contrast: withdraw the theme's spacer borders, keep the host's real ones

**Decision.** Under `@media (forced-colors: active)` the transparent spacer borders on
sidebar rows are removed and their width moved into padding. The card's borders are
left alone.

**Why the distinction.** Two different kinds of border exist in this theme:

- **Real edges** — the 1px card outline. Forced-colors turning these into CanvasText is
  the desired outcome: it is what keeps the three-surface composition readable once all
  fills are flattened.
- **Layout spacers** — the transparent 1px on session and nav rows, declared so the
  hover edge can appear without moving the row. Forced-colors cannot know they were
  meant to be invisible and paints them as CanvasText. Measured: 0 of 8 rows bordered
  normally, **8 of 8** under forced-colors. Every row grew a box it was never given.

**Why not `forced-color-adjust: none`.** It is the obvious tool and it is wrong here:
it inherits, so it would switch high contrast off for the row's text and its switch —
the content the user asked to have at high contrast.

**Why the two controls need different compensation.** `padding-block` replaces rather
than adds. Session rows had 0 vertical padding (becomes 1px); nav buttons had 7px
(becomes 8px). A single value made the nav buttons 2px shorter. Measured: 38px → 36px.

**Why the selector is doubled.** The block lives in `BASE_CSS`, which the kernel
prepends, and the feature rule declaring the spacer border has identical specificity.
Same specificity, earlier source order: the feature wins and the block is a no-op —
which is what the first attempt was. Repeating the subject attribute raises specificity
without `!important` and without moving the token layer after the features.

---

## D47 — The switch matches the host switch, and the plugin declares no literal colour

**Decision.** The Settings switch uses a 999px track radius, `#dsw-alias-label-primary-foreground`
for the knob, and no shadow — because the host's own switch does. A source scan for
literal colours is a gate failure (check 15).

**Why the control had to change at all.** It was written "from tokens, matching the host
control's geometry", and compared against the host's actual switch it matched on box
size and knob size and disagreed on three other things: the track was a rounded
rectangle where the host draws a pill, the knob carried a shadow the host does not have,
and the knob used `--dsw-alias-bg-overlay`, which resolves to `#e9ecf2` in light and
`#61666b` in dark rather than the host's `#fff` / `#0f1115`.

**Why the shadow was deleted rather than tokenised.** The audit suggested
`--dsh-bento-knob-shadow`. That would have preserved an invention. The host's knob has
`box-shadow: none` in both themes.

**Why the knob token is not the obvious one.** `--dsw-alias-switch-thumb` resolves to
`#adb2b8` in dark, which is not the `#0f1115` the host paints.
`--dsw-alias-label-primary-foreground` was the only candidate matching all four
theme/state combinations, and it was found by resolving every candidate against the
painted colour rather than by choosing on the name.

**Cost.** The gate is a source scan: it cannot see a colour assembled at runtime, and
comments are stripped first because the token layer documents host values (`#ebeef2`)
as prose. It is a floor, proved red against three plants — the removed shadow, a hex in
a CSS template literal, and a named colour.
---

## D48 — Icons are punctuation, and the theme draws none in the UI

**Decision.** No feature adds an icon to the interface. The package's `icon.svg` is a
**package icon** and must never be rendered inside the UI. If a UI mark is ever genuinely
needed, it is a separate 16×16 outline asset — not that file.

**Why.** Measured, not preferred:

1. **The reference is icon-sparse.** Across 14 bento pages there are 21 `<svg>` elements
   total; **7 pages have none**, 6 have one or two, and the single page with 13 is a
   different product embedded with a different system (18px box, 24 viewBox, 2px stroke).
   The pages carrying real bento cards are the icon-free ones. Density, weight and
   alignment carry the look.

2. **The host already draws every chrome icon, and draws it well.** Measured across 49
   icons in both themes: one 16×16 grid, `currentColor` on **all** of them, outline-first,
   `butt` caps and `miter` joins. Because they are `currentColor` they already follow the
   theme's surfaces. Restyling them would mean overriding host ink, which is the same
   class of mistake as restyling host typography (D35).

3. **A theme that adds glyphs is adding content it does not own.** The one legitimate
   icon a theme owns is the one that identifies the theme itself.

**The discriminator test.** Before any icon: name the other icon in the interface it
could be confused with. If the answer is "nothing", it is a discriminator and earns its
place. If the answer is "anything", it is decoration — the "icon soup" failure.

**Known limitation, and it is visible.** The Settings tab that configures this theme is
drawn with the **same gear** as General and Remote Access: 4 distinct glyphs across 6
tabs, confirmed by byte-identical path data and 4× pixel crops. The nav glyph comes from a
host-side map keyed by section id, and an unknown id falls back to the gear. Not fixable
in CSS. Recorded as the one real icon defect in the theme, and as the icon worth drawing
if the host ever exposes a glyph hook.

**The package icon is not a UI icon.** `icon.svg` is `0 0 32 32`, solid, four shapes at
three opacities, filled with the literal `#4C7DF0`. In an app-icon slot that is correct.
Rendered inside the UI it would be a 32px filled blue mark among 16px outline
`currentColor` glyphs. Its blue also scores **3.28** on the light canvas — it clears the
3:1 floor for a graphical object and nothing more, and being fixed it will not follow a
registered theme.

**If an in-UI icon is ever added**, it matches the measured system, not the published
one: `0 0 16 16`, 16px, 1px stroke (1.3 permissible only inside the Settings dialog),
`butt`/`miter`, outline, `currentColor` (which gate 15 already enforces), sized ~1.1× the
adjacent text size and centred on the text box.
---

## D49 — The UI icon is a 36px package mark, and it is decorative

**Decision.** `icon.svg` is a **36×36 package icon**: a single-weight outline tray in the
host's own cyan→blue gradient, `role="presentation"` and `aria-hidden="true"`. It is the
one UI artefact this theme owns, and it is the only icon it draws.

**What was reachable, measured.** Two host slots were considered and both are closed:

| Slot | Reachable? | Why |
|---|---|---|
| Settings nav tab glyph | **no** | host-side hardcoded map keyed by section id; unknown id → the gear, shared with General and Remote Access |
| Plugins page row | **only when installed** | rows exist only for bundles with `"installed": true`, which the plugin *manager* sets |
| The package `icon` export | **yes** | what the Plugins page renders once installed |

An earlier attempt to force the plugin into the web profile's `bundles` list was wrong
and was reverted: it does not set `installed`, so it changed nothing and only dirtied the
profile.

**Why 36 and not 16.** The in-UI glyph grid is 16px with a 1px stroke, but the *package*
slot is a different artefact at a different size: every package icon on the Plugins page
is `width=36 height=36 viewBox="0 0 36 36" fill="none"`, with a glyph occupying roughly
19×18 inside ~8.5px of padding. Drawing a 16px outline glyph here would have been the
wrong system applied correctly.

**Why a gradient, in a theme that bans literal colour.** The ban (gate 15) governs `src/`
— UI chrome, which must follow the registered theme. A package icon is **artwork**: the
host's own package icons use fixed gradients (`#54ECE7 → #658EFF`) that were verified
**not** to change between light and dark. Matching them is the correct choice, and the
gate already scopes to `src/*.js`, so no exemption was needed.

**Why it is decorative.** The host wraps every package icon in
`<span aria-hidden="true">`, so the row title carries the accessible name. An earlier
draft had `role="img"` plus an English `aria-label`, which claimed standalone semantics
the icon never has and could not be localised in a static file. `role="presentation"` +
`aria-hidden` + `focusable="false"` is the honest description.

**The mark.** A rounded container divided into one large compartment and two stacked
right-hand cells. Chosen over three alternatives (four equal cells; three columns; a card
with an inset) because those read as *generic grid*, *columns* and *card* — none of them
say "bento tray". Verified at 36px and at 120px against the live host set.

**Not verified, and the reason.** It has not been seen rendering inside the app. The
Plugins page only shows `installed: true` bundles, and installing via the plugin manager
writes to the **desktop** profile — the Electron-owned one this project has a standing
rule never to test in. What *is* verified: the export resolves
(`./icon` → `icon.svg`, 614 bytes), it parses, it renders inline and as a `data:` image
with the gradient resolving, and its attribute set is byte-for-byte the convention the
host's own icons use.
---

## D50 — Never declare `position` on a host-owned element

**Decision.** A feature may restyle an element's **paint**; it may not rewrite the
host's **layout positioning**. `position` on any element reached through a host anchor
is a gate failure (check 18).

**Why, from the shipped bug.** The right panel would not scroll. It was not a scroll
bug. The host positions the panel root `position: absolute` with all four insets set
(`.P3OORG_panel`), so its **height comes from being edge-anchored**. The right-panel card
feature declared `position: relative` on that same element to give its card a containing
block. That override detached the panel: it stopped being edge-anchored, had no height of
its own, and collapsed to content.

| | panel height |
|---|---|
| theme off | **900px** (fills the column) |
| theme on | **288px** (content height) |

Every wrapper inside the pane is `overflow: hidden`, so the missing 612px was not
clipped-and-scrollable — it was unreachable. The user-visible symptom ("no scrolling")
was three layers away from the cause.

**Why `z-index` went with it.** `z-index` only applies to positioned elements, so it was
inert except as documentation of an intent that only worked *because* of the bug. The
card is painted on the column's own `::after`, and the panel is a later child in paint
order, so it sits above the card without help. Verified after removal: card still
painted, 0 spill.

**The general shape of this mistake**, which is why it gets a gate rather than a note:
restyling a box and repositioning a box look like the same kind of edit in CSS. They are
not. Paint is ours; layout is the host's. When a host element's size derives from a
property, overriding that property is not a style change — it is a silent layout change,
and it will not fail loudly.

**The exemption, measured rather than assumed.** The Settings content column keeps
`position: relative` because the host leaves it `position: static` — checked with the
theme off — so nothing is detached. Its card is painted on `::before` with `z-index: -1`,
which costs no layout width. Verified in both states: content 612x800, fills the panel,
the real scroller still `overflowY: auto`. The exemption is named in the check so the
next reader knows it was checked, not overlooked.
---

## D51 — The card is inset; the panel is not. Pad the pane, never the panel.

**Decision.** Where a feature paints a card inset from its column, any host chrome that
spans the full column must be padded INSIDE, not moved. Padding on the panel root is
forbidden here because its height is its edge-anchoring (D50).

**Why, from the shipped report.** "The bento curves are making the border text touch the
border." Measured, nothing was literally touching: every text box cleared the card by
12px or more. The problem was at the **corners**, where geometry is not a bounding box.

The panel root is host-positioned absolutely and spans the whole column
(880..1600, 0..900). The card is painted inset by the gutter (892..1588, 12..888). So the
card sits *inside* the panel and the panel's own chrome overhangs it on all four sides:

| | measured | card edge | overhang |
|---|---|---|---|
| right-hand buttons | end x 1594 | 1588 | **6px outside** |
| header buttons | y 10 | 12 | **2px above** |

Near the rounded corners the chrome and the stroke overlap — which is what the report
described in words and what a bounding-box check could never have found.

**Why padding inside and not on the panel.** Padding the panel would move its box, and
its height comes from being edge-anchored. Measured: `margin` on the panel dropped it
from 900px to 876px — reintroducing exactly the D50 failure. Padding the tab host keeps
the panel where the host put it and insets only the contents. `+ 1px` because the card's
1px border is drawn outside its own radius, so clearing the gutter alone still grazes the
stroke.

**The measurement method matters as much as the fix.** Three attempts were made before
the right test existed:

1. A bounding-box comparison against the card edge said everything was fine — because a
   12px inset is fine on a straight edge and fails at a 20px arc.
2. A rounded-rect containment test on *text boxes only* also passed, because the clipped
   elements were **icon buttons**, not text.
3. The test that found it checked every text box AND every control against the actual
   arc, corner by corner, and reported which corner failed. That is what showed the
   buttons failing at `y=10` against a card top of `12` — a vertical overhang hiding
   behind a horizontal-sounding report.

**Verified.** Both themes: 12/12 text boxes and 14/14 controls inside the rounded
boundary, 0 outside (was 3 clipped header buttons), panel height still 900px. The D50
scroll fix still passes, the full feature regression sweep is green, and the sidebar and
centre columns were re-checked with the same test (0 violations).
---

## D52 — Popups and panels are left on the host's own material, and that is confirmed, not assumed

**Decision.** The three floating surfaces — the attachment/command menu, the model
selector and the permission/access-mode menu — stay untouched. D38 said menus were
deliberately left alone; this entry records the measurement that says the decision is
still right now that the shell around them has changed.

**What they are, measured:**

| surface | size | paint | radius | cells |
|---|---|---|---|---|
| attachment / command menu | 853x347 | `rgba(38,49,72,0.06)` | 12px | 12px cells, 34px rows |
| model selector | 248x76 | `rgba(248,249,250,0.58)` | **16px** | 12px cells, 34px rows |
| permission menu | 161x110 | `rgba(248,249,250,0.58)` | **16px** | 12px cells, 34px rows |

The two small menus carry `backdrop-filter: blur(40px) saturate(1.5)` — frosted glass
over whatever is behind them. The attachment menu is a flat translucent tint instead.

**Why they are not adapted.** They are not chrome, they are *overlays*: they sit above
the composition rather than inside it, and their job is to be legible against anything
they happen to cover. A frosted translucent layer does that; an opaque card on our canvas
token would not, because it would have to pick a side of the light/dark boundary and then
fight whatever it floats over.

And the numbers already line up with the rest of the theme: **12px cells** is exactly
`--dsh-bento-radius-inner`, and **34px rows** is exactly the session-row height. The
16px outer radius is a step between our 20px card and our 12px cell — appropriate for
something floating above the grid rather than being one of its cells.

**The measurement that matters:** queried the theme's own stylesheet against all three
popups. `themeMatched: null` for every one — the theme does not touch them at all. So
"do they adapt" has a precise answer: no, and they were never meant to.

**What this would cost if reversed.** Styling them would mean a body-level selector with
no ownership boundary (they portal out of the shell), an opaque surface that breaks the
frosted-glass affordance, and a fight with whatever the host already gets right. Recorded
so the next session does not rediscover the temptation without the reason.

**One real consequence, stated plainly.** Because the popups are translucent, they show
the canvas colour through them. That is correct behaviour and is visible in the crops:
the menus pick up a faint blue-grey cast in light mode. That is the theme being seen
through the glass, not the theme failing to apply.
---

## D53 — Settings is one board across every tab, not one tab

**Decision.** Every tab in Settings is themed, and the host's own inner cards become
tiles on the board. The anchor is structural — a list item inside a settings section —
never a class name.

**What was wrong.** The settings feature keyed its row rules on
`[data-slot="settings.general.item"]`, which only the General renderer writes. Measured
across all six tabs: **one was themed, three still drew bordered white cards inside the
content card,** two are this plugin's own.

| tab | renderer | cards before | after |
|---|---|---|---|
| General | `settings.general.item` slots | 0 | unchanged |
| Models | `zGbnIq_` | 2 x 564x54 | tiles |
| Built-in plugins | `qSYn7G_` | 29 x 277x84 | tiles, grid kept |
| Agent presets | `rtSEdW_` | 4 x 276x191 | tiles, selection kept |

Three separate bundles, three separate CSS-module hash prefixes, all changing when a
section is added — which is why the class names could not be the anchor even if they
were readable. All 35 cards share one shape, and that shape is stable.

**Flatten the paint, keep the layout.** Border and fill go; the box does not move.
Nothing sets `display`, `grid` or width. Two reasons, both measured:

- The 2-up grids are right. Collapsing 29 plugins into one column would be a worse
  answer than a box, not a more bento one.
- `box-sizing: border-box` means removing a border grows the content and never the
  cell, so the grid cannot reflow. Cell heights drop by exactly the border: 84→82,
  191→189.

**Two regressions caught by measuring rather than by looking.**

*Selection.* Agent presets marks the chosen mode with a border and a tinted fill —
precisely the two properties the flattening removes. Losing it would leave "which mode
is the default" unanswerable. Re-expressed in the board's own vocabulary: canvas fill
plus inset edge, the same pair the selected Settings destination already uses, keyed on
`aria-pressed` because that is the state and it is stable across renderers. The `:hover`
rule excludes the selected tile, or hovering the default would make it look unselected.

*Padding with no box.* Removing a card leaves its padding behind. Padding with nothing
around it does not read as breathing room — it reads as misalignment. Models rows kept
`padding: 12px 14px`, putting every label 14px right of the section heading and leaving a
54px empty band. Trimmed with the negative-margin-plus-matching-padding trick the General
rows already use, so the label returns to the heading's x (measured drift 14px → 0px)
while the hover fill still reaches the card edge.

**Not a defect, checked and dismissed.** Eight description spans report
`scrollHeight > clientHeight`. That is the host's own `-webkit-line-clamp: 2`, measured
identical with the theme disabled. The "clipped text" reading was wrong.
---

## D54 — Inner radius is derived from the outer, not chosen from a scale

**Decision.** Where a rounded surface sits flush inside another rounded surface, its
radius is `r_outer - gap`. The Settings card and everything flush with it are therefore
**16px**, derived as the host panel's 28px minus our 12px gutter. The value is a named
token, `--dsh-bento-radius-nested`, because it exists to express that derivation.

**This supersedes the reasoning in D45 / the token comment.** The earlier argument for a
12px inner tier was sound for its own case — the host uses 12px on every row in the
sidebar column — but incomplete. It was measured on rows the host never nests under a
28px panel. Our Settings card *is* nested under one, so it has to follow that outer curve
instead. The 12px tier still owns controls inside a card, which is most of the interface.

**What was wrong, measured.** Cropped at 6×, the panel's top-right showed three unrelated
curves: the 28px panel, a 12px content card, and a 12px button. The frame between panel
and card was 12px along the straight edges and roughly 5px at the 45° point — the card's
corner visibly pulling away from the panel's arc.

| | before | after |
|---|---|---|
| panel radius | 28px | 28px |
| gap | 12px | 12px |
| ideal card radius | 16px | 16px |
| actual card radius | 12px | **16px** |
| arc-centre delta | (4, −4) | **(0, 0)** |
| gap at 45° | ≠ edge gap | **12px, equal** |

**Why the panel's 28px is a literal.** It is not on the host's radius scale, which tops
out at 20px (`--dsw-radius-xl`). Measured 28px in both light and dark, so it is a fixed
host value, and 16 is derived from it rather than hardcoded from one observation.

**The rule's boundary, which cost the most to get right.** "Inner matches outer" binds
containers — surfaces that FILL their parent, so the two curves run side by side around
the same corner. It does not bind controls placed inside a container. A 28px close button
2px from a card edge is not a nested container; matching it to the card's curve would
give it a 14px radius, i.e. a circle. The discriminator used in testing is **coverage**:
a nested surface covers ≥50% of its container's area. Switch thumbs (r=50), status pills
(r=999) and small icon buttons all fall below it and are correctly exempt.

**Applied consistently, not just at the panel.** Three places had the same defect one
level down: the nav pill and the General rows (both flush inside the panel, both were
12), and the clickable surface filling each tile (20 inside a 16px tile — a child rounder
than its parent). The last one inherits from the tile rather than restating a number, so
the two cannot drift apart the way D45's literal did.
---

## D55 — Selection is an accent tint, derived from the host accent, not copied from the reference

**Decision.** A selected row is marked with a **tint of the accent** behind its label, the
label and icon in a **darker/lighter accent**, and **no border**. Both colours are
`color-mix()` derivations of `--dsw-alias-state-business-primary`, never copied hexes.

**Why not copy the reference.** The reference supplies `accent-soft #E8EFFE` and
`accent-ink #1E4FBF`. Two problems:

1. **They are one theme's values.** The host accent is `#4176e6` in light and `#7aaaff` in
   dark. A light-mode tint pasted into dark mode is wrong, and there is no second pair to
   paste. The derivation resolves correctly in both themes from one declaration.
2. **Gate 15.** `src/` may contain no literal colour. A mix is an expression of a host
   token, so the rule still holds — and the derivation is the token.

**The values, and why the ratio is not intuitive.**

```
fill = 12% accent over the surface   (card, or canvas where the cell sits on canvas)
ink  = 65% accent toward label-primary
```

12% over white resolves to `#E8EFFC`, within **1 RGB unit** of the reference's `#E8EFFE`.

The ink ratio had to be measured, because the intuitive direction is wrong. `label-primary`
is near-black in light and near-white in dark, so mixing *further* toward it **washes the
ink out** and contrast falls:

| ratio | worst-case contrast (both themes, both backdrops) |
|---|---|
| 78% (first attempt) | **4.14:1** — below AA |
| 70% | 4.42:1 — below AA |
| **65% (shipped)** | **4.60:1** — passes |

65% is the smallest margin that clears AA on the canvas tint in dark mode, which is the
tightest of the four cases. The reference's own pair measures 6.22:1.

**Where it applies.** Three places, so selection is one idea rather than three:

| surface | before | after |
|---|---|---|
| sidebar session row | host's neutral grey `rgba(38,49,72,0.06)` | accent tint + accent ink |
| Settings nav destination | white tile + inset edge | accent tint + accent ink |
| Agent preset tile | canvas tone + inset edge | accent tint + accent ink |

The sidebar case is the one that matters most: the host marked the active row with a
**neutral grey**, which on a grey canvas is barely a signal at all.

**Two different host tokens per surface, deliberately.** The tint is mixed against the
card where a tile sits on the card, and against the canvas where the cell sits on the
canvas. Using one for both would put the selected cell a shade off the surface it appears
to share.

**The icon follows.** Verified rather than assumed: the nav glyph's SVG paths resolve to
`currentColor` and compute to the accent ink, so setting the row's `color` colours icon
and label together — matching the reference, where the whole row is blue.
---

## D56 — The Blue & Orange token reference: what we take, what we do not

**Decision.** We adopt the reference's **selection treatment** and its **token model**.
We do **not** adopt its **colour values** or its scale.

The question "are we using this token reference?" has three separable answers, and
answering it monolithically would be wrong either way.

**1. Its values — no, and it would be wrong to.** `Tokens.dc.html` is a different
product's design system (an RSI KPI dashboard): `#F6F7F9` page, `#2F6BEB` accent, 24px
cards, Inter, an orange alternative theme. This plugin is a theme *inside another host*
whose surfaces, accents and aliases belong to that host. Imposing a second palette would
mean either overriding host tokens (which the gate forbids, because light/dark/registered
themes must keep working) or shipping literals (same gate). Its scale also conflicts
directly with measured host values: 24px cards against the host's 20/28, and its own
8/9/16/20/24 radius set against ours.

**2. Its model — yes, and we already matched it.** The reference's organising idea is:
*every colour is a named CSS variable, the switch swaps the whole set, status colours stay
fixed across themes.* Our tokens have that exact shape in the host's own names
(`--dsw-alias-*` for values, `--dsh-bento-*` for composition), and swappability comes free
because the host owns the alias layer and already swaps it for light/dark. Nothing needed
adopting here; D55's derivations then follow whichever set is active.

**3. Its selection treatment — no, and this was a real gap.** The reference marks a
selected row with a tint of the accent, the label in a darker accent, and no border. We
were using a white tile with an inset edge (Settings) and a neutral grey (sidebar). That
is the one part of the reference that is both correct for our context and was missing, and
it is what D55 adopts.

**One thing the reference gets wrong for us, recorded so it is not copied later.** Its
`accent-soft` / `accent-ink` are a *pair for the blue theme*; the orange theme has its own
pair. Copying either into a host with a per-theme accent and no soft/ink tokens produces a
tint that is correct in exactly one of light and dark. Deriving with `color-mix()` from
whatever accent is active is what makes the pattern portable — which is why we took the
pattern and not the numbers.

**Referenced file:** `C:\Users\ADMIN\Downloads\Theme tokens – Blue & Orange-html\`
(`Tokens.dc.html`, 25 token rows, and its `README.md` which states it is a reference
mockup and that values should be replicated in the implementation's own styling system —
which is precisely what D55 does.)
---

## D57 — The card shadow is opt-in, and derived from the theme's ink

**Decision.** A seventh feature, `card-shadow`, lifts the four card surfaces with the
reference's two-layer soft shadow. It is **off by default** and appears as a row in the
plugin's own Bento layout tab.

**The border rules the reference states were already satisfied.** Every card has a 1px
hairline (`var(--dsh-bento-edge)`) and rounded corners — radius 20 on the three columns,
radius 16 (the nested tier) on the Settings card. Nothing needed changing there. What was
missing was the optional lift.

**The token.**

```
--dsh-bento-shadow:
  0 1px 2px  color-mix(in srgb, var(--dsw-alias-label-primary) 4%,  transparent),
  0 8px 24px color-mix(in srgb, var(--dsw-alias-label-primary) 6%,  transparent);
```

Offsets, blurs and alphas are the spec's, unchanged. The **colour is derived**, and that
is a correctness requirement rather than a stylistic one:

- The spec's `rgba(15, 23, 42, …)` is a near-black. `--dsw-alias-label-primary` is that
  same near-black *per theme*: `#0f1115` in light, `#f9fafb` in dark.
- Resolved, this yields `(15, 17, 21)` at `.04` and `.06` — within a few RGB units of the
  spec in light, and correctly *light* in dark, where a shadow must be darker than the
  surface beneath it rather than darker than white.
- A literal black would be invisible in dark mode. That is why gate 15 forbids the
  literal, and why the derivation is the right answer rather than a workaround for the
  gate.

**Off by default.** A shadow is a preference, not a correction: the flat board is a
complete look. Defaulting it on would change how every existing user's shell reads on
update, for a choice they did not make.

**Where the shadow is applied, and where it is not.**

- On the **painted pseudo-elements** (`::after` / `::before`), not on the columns. The card
  surface is the inset rectangle; a shadow on the column would draw around the column's
  own edges, outside the gutter, and the card would look like it sat on a larger invisible
  plate.
- **Withdrawn on the collapsed sidebar rail**, where the card drops to a 10px radius and a
  shadow drawn for a 20px card reads as a mistake. The rail keeps its hairline, so it does
  not lose its edge.
- The Settings card takes it too, under its own rule, because its radius is the nested
  tier rather than 20.

**Why `box-shadow` needed no geometry measurement.** Unlike every other change in this
theme, it cannot affect layout — it cannot move a 1px border, reflow a grid, or change a
card's height. Verified anyway: centre card 1320x900 and Settings card 800px before and
after, unchanged.

**Gate 19 added.** No `box-shadow` unless it resolves through a token. Proved red by
planting the literal form; both this gate and gate 15 catch that plant, which is the
correct amount of overlap for a rule with two ways to break.
---

## D58 — Selected rows carry weight as well as colour; the host font is not replaced

**Two decisions from one report.**

> **SUPERSEDED IN PART BY D59.** The font half of this entry is wrong on its facts and
> wrong on its conclusion, and D59 replaces it. This entry is kept rather than edited
> because the reasoning is the useful part: it shows how a single width probe produced
> two confident false claims. Read D59 for what actually shipped.

### Selection carries weight

The selected Settings destination is now `font-weight: 500` as well as tinted and
accent-inked. Colour alone marks a chosen row only if the tint separates from the canvas
at a glance; a heavier label says it in a second channel that survives a grey-scale
screenshot, a dim display and a colour-vision difference. The reference does the same —
its active nav item is both tinted and stronger.

**500, not 700.** Measured before choosing: the label resolves at 400, and applying 600
changed the cell's box not at all (164×40 before and after), so weight costs no geometry.
500 is the lightest step that still reads as deliberately heavier beside a 400 sibling;
700 would make a nav row compete with the dialog's own heading.

**On the label, not the button.** The icon beside it is a stroked SVG that `font-weight`
cannot affect. Naming the text keeps the rule honest about what it does.

### The host font is kept

Asked whether we use the reference's UI font. The reference specifies **Inter** plus
**JetBrains Mono**. Measured here:

| | result |
|---|---|
| host body font | `-apple-system, BlinkMacSystemFont, "Segoe UI", …` |
| Inter available in the browser | **yes** (width probe differs from the system stack) |
| JetBrains Mono available | **no** |
| faces loaded by the page | none — the host loads no webfont at all |

**Decision: the font is not replaced.** Three reasons, in order of weight:

1. **It is the host's, not the theme's.** A UI font governs every surface in the
   application, including plugins this theme knows nothing about. Overriding it from a
   layout plugin is a scope violation with visible consequences for things we do not own.
2. **Half the pairing does not exist here.** Adopting Inter without JetBrains Mono would
   leave code and inline tokens in a different family from the reference's own intent —
   the pairing is the design, and only half of it can be delivered.
3. **`-apple-system` is not a fallback to be fixed.** It is the platform UI face, chosen
   by the host so the app matches the OS. Replacing it is a product decision about the
   whole application, not a theme feature.

What the theme *does* control is type *rhythm* — sizes, weights, spacing — and that is
where the reference's typographic influence actually lands (D58 above, and the 4px scale).
If the owner wants Inter globally, that belongs in the host's theme configuration, and
this plugin should follow it rather than fight it.
---

## D59 — Two typefaces ship inside the bundle; the composer row becomes one toolbar

**Two decisions from one report, and a correction to D58.**

### Correction first: two of D58's four measurements were wrong

D58 answered "are we using the reference's UI font?" and concluded no, on four measured
claims. Two of them do not survive re-measurement with the right instrument:

| D58 claimed | measured now | how the error happened |
|---|---|---|
| Inter is **available** in the browser | **not installed** | one canvas width probe, compared against nothing |
| JetBrains Mono is not available | **not installed** — correct | — |
| the page loads no webfont | correct | — |
| `-apple-system` is the host's deliberate face | correct, and still a product decision | — |

The Inter claim was made by measuring a string in `font-family: Inter` and finding it
*differed from `sans-serif`*. It differs because a CSS font stack that names a missing
family falls back to the **browser default**, not to whatever the element had. The probe
compared two different things and reported the difference as evidence of presence.

The test that actually answers the question compares a candidate against **two different
known-missing families**: a real installed font differs from both, a missing one matches
both. Inter and JetBrains Mono both matched both, so neither is installed. Windows lists
262 families and Inter is not among them.

**The lesson, recorded in learning.md L69:** a font-availability probe needs a negative
control. "Different from A" does not mean "therefore installed" — it means "different
from A".

### Decision 1: Inter and JetBrains Mono ship as one feature, embedded

The owner asked for the reference's font after being told it could not be delivered as a
pair. Both halves are now available because both are **bundled**: 48 KB of Inter and 40 KB
of JetBrains Mono, latin subset, variable weight axis, base64 inside `client.js`.

**Why embedded rather than served.** The host serves a plugin's browser half through one
concatenating module route (`/plugins/??<pkg>/client.js&rev=…`). Probed directly: every
other shape for a package file — `icon.svg`, `package.json`, a `fonts/` directory, with and
without the `??` form — answers **404**. A plugin can only hang a real file on a route it
registers in its **host half**, which is how `dsh-claude-style` serves its own four faces.
This plugin's `index.js` documents that its host half is deliberately inert, because work at
activation turns any mistake into a whole-application boot failure. Adding a font route means
host code, a route table and a boot-path failure mode, to serve 88 KB on loopback.

**The cost, stated plainly.** `client.js` goes from **89,627 to 217,694 bytes** — +128 KB,
of which 118 KB is the two base64 blobs. It is paid once at module load, on localhost, and
it buys both faces at every weight from two files rather than eight. That is a real cost and
it is accepted, not hidden.

**Why one feature and not two.** Inter and Mono are a pairing: adopting one without the
other leaves code in a different family from the text, which was exactly D58's second
objection. One row in Settings means the pair arrives and leaves together.

### Decision 2: the mechanism is two token overrides, not thirty-one

The obvious implementation overrides every `--dsw-font-*` token, because the measured
values look independent: `--dsw-font-markdown-h1` reads back as a complete shorthand with
the family spelled out, and so do `--dsw-font-s-14`, `--dsw-font-xs-13` and thirty others.

That reading is wrong. Custom properties are substituted **when computed**, so a token
declared as `14px/24px var(--dsw-font-family)` reads back with the stack already filled in.
Reading a token's resolved value does not tell you whether it was literal or derived.

Measured by redefining `--dsw-font-family` alone on `body` and re-reading all 183 font
tokens: **62 followed**, and exactly **one** stayed literal — `--dsw-font-family-brand`,
which is Montserrat by design and belongs to the wordmark. So the rule is:

```
--dsw-font-family:      'Bento Inter', <host stack unchanged>
--ds-font-family-code:  'Bento Mono',  <host stack unchanged>
```

Everything else resolves itself. Overriding 31 tokens by hand would be 31 chances to drift
out of step with the host, to solve a problem that does not exist. A gate now pins this
contract, so if a future host build inlines families into those tokens instead, the build
fails rather than silently half-applying the font.

**The fallbacks are load-bearing.** Both subsets are latin-only. The host's own CJK faces
(`PingFang SC`, `Hiragino Sans GB`, `Microsoft YaHei`) are reproduced unchanged after the
two new families, so Chinese text keeps its platform face instead of landing in an
arbitrary fallback.

### Decision 3: the composer's control row becomes one toolbar

Measured with the theme off, the composer's bottom row held four controls that disagreed:

| | size | fill | radius |
|---|---|---|---|
| attach | 28×28 | `rgb(245,246,247)` | **999** (a circle) |
| access selector | 149×28 | transparent | 8 |
| model selector | 180×28 | transparent | 8 |
| Send | 34×34 | accent | **999** |

Two circles and two bare-text controls, at two heights, with no fill tying the text controls
to the button beside them. That is what "cramped" was describing: not tight spacing, but
three unrelated fragments where one row should be.

`composer-chips` gives both selectors **one fill and one radius** — the fill the attach
button already resolved to, reached through `--dsw-alias-bg-module-platform` rather than
copied, and the 12px inner tier stated through its token. Internal gap widens from 4 to 7.

**Send is deliberately left alone.** It is the row's primary action; rounding it to the
row's radius would flatten the one element carrying emphasis.

**A readability fix rode along.** The model selector's effort suffix ("High") resolved to
`--dsw-alias-label-caption`, `rgb(173,178,184)`, against the composer canvas: **1.83:1**.
AA asks 4.5:1 at 13px, so it was unreadable, not merely quiet. Promoted to the secondary
label — **5.36:1 light, 8.03:1 dark**. Kept visually secondary by weight (400 against the
label's 500) rather than by washing the ink out.

### Not done, and why

- **The three type-scale findings from the P2 audit stay open.** D35 decided no type scale.
  The font swap changes the face, not the sizes, and nothing here re-opens that.
- **No webfont for the host's own UI.** `--dsw-font-family-brand` keeps Montserrat: a theme
  plugin re-fonting the product wordmark is the scope violation D58 was right about.
- **No size change to any control.** Touch targets stay exactly as the host set them.
---

## D60 — The Settings navigation gets a card, and it is the same element as the content card

**Decision.** Settings is a two-region dialog: a navigation column and a content column.
The content column has been a raised card since the Settings board shipped; the
navigation column was left bare on the canvas. It now has a card too, and the two are
the same element in the same composition — same inset, same radius, same tone, same
top and bottom edges.

**This reverses an earlier note, and the earlier note was the wrong argument.** It said
"a list of destinations is not a unit of content, and one surface per region is what keeps
the composition from reading as boxes inside boxes". The second clause is a real principle
and it is still held: there is no nesting here, the two cards are siblings on one canvas.
The first clause is what fails. The main page's sidebar is a list of destinations and it is
carded; the Settings sidebar is the same kind of object, and carding one of the two makes
the other read as leftover background rather than as a peer.

**Geometry is copied from the sidebar, then adjusted by measurement.** Measured on the main
page: card inset 12px from the column edge, radius 20px, 1px edge. The Settings panel is
28px, so the nested tier applies: inset 12px, radius 16px — the same values the content
card already uses. Measured after: top delta 0, bottom delta 0, 24px between the cards.

**The nav padding is 14px, and that number is forced.** The column is 188px, so the card is
164px, and each px of padding narrows every button by 2px. Measured against this machine's
**actual 13 Settings tabs** — not the 6 the test profile has, which made the first two
attempts look safe:

| nav padding | button | px inside card | truncates |
|---|---|---|---|
| 12 (host) | 164 | 0 | Archived sessions |
| **14** | **160** | **2** | Archived sessions *(already, at the host's own padding)* |
| 16 | 156 | 4 | + Usage Statistics |

"Archived sessions" needs 120px of text and has 112px even before this change, so it is the
host's existing overflow and not this theme's. 14 is the widest card margin that does not
cost a second label. The 2px reads as sufficient because the card's border plus the
button's own 16px radius separate the fill from the edge.

**No `position` is declared.** The card needs a positioned ancestor and the host already
supplies one: measured with the theme off, the nav is `position: relative`, `flex: 0 0 auto`,
188x800. Declaring it ourselves was the first attempt and it changed nothing (every button
stayed 160x40 at the same y) — and gate 18 correctly flagged it as a needless claim on a
host-owned box. Only `z-index: 0` is added, which is what the `z-index: -1` pseudo needs.

### The gate that caught it had two bugs of its own

Gate 18 refused the first version, and the refusal was right — but investigating it turned
up two defects in the gate that had been hiding violations:

1. **Its `(?!nav)` exclusion could never fire.** `\s*` can match zero characters, so on
   `" > nav"` the lookahead runs *before* the space and tests `" nav"` — never `"nav"`.
   Proven directly: `/ >\s*(?!nav)/` matches `">"` and the lookahead sees `" "`. The
   exclusion was also the wrong shape; `> div` is exactly as host-owned as `> nav`.
2. **Its rule tracker never closed at end of file.** It reset only on a *bare* `}`, but
   every fragment ends its last CSS block as `});` (the `FEATURES.push` call). So `current`
   stayed on the previous selector, a `position:` declaration added after it was attributed
   to `FEATURES.push({`, and a real violation passed silently. Found by planting one and
   watching it survive.

Both are fixed, and the check now has an explicit, narrow exemption for **our own
`::before`/`::after`** — a pseudo we create has no host-solved box to collapse, which is the
card mechanism's whole premise. Four proofs now pin the repaired behaviour: a position on the
host nav fails, on our own pseudo passes, on a class-fragment element fails, and a clean tree
passes.

## D61 — The composer is raised, not recessed

**Decision.** The composer's surface is the card tone plus the hairline plus the theme's
soft shadow. It is no longer painted with the canvas tint.

**What was wrong.** It was `--dsh-bento-canvas` (#ebeef2) with an inset hairline, described
as "a panel recessed into the card". Measured, that tone is **1.16:1** against the card — a
real but very slight step, and across an 861px-wide surface it reads as a blue-grey slab laid
over the conversation rather than as a control. The owner's report was correct.

**What the reference actually says, and what it does not.** The reference corpus is a
dashboard and contains **no composer**, so it does not specify this control. What it specifies
is the relationship between its surfaces: `--surface` is `#FFFFFF` everywhere, separation
comes from `--border` (#E3E7EE) plus a shadow, and `--panel` (#F3F6FC) is the calm tone used
*behind* a card. Applying that relationship puts a control that sits *on* a card in the
raised family, not the recessed one. Saying "the design says the composer is white" would be
overclaiming; this is the design's rule applied to a control the design does not contain.

**The shadow is the existing token**, so it follows the theme ink and is visible in dark mode
(matched 2 outer layers in both themes, measured). It stays an **inset** hairline rather than
a border, because a border adds 2px to a control the host has already sized (D14).

**Answered, for the owner's second question:** no, the design does not call for a blue text
box. The blue was this theme's own canvas token, not the design's, and it is now gone.

---

## D62 — The To-dos dock gets an edge, in both states, from one rule

**Decision.** The host's To-dos dock takes the card tone plus the theme's inset hairline and
soft shadow. It is the same raised treatment the composer got in D61, applied to the panel
that sits directly above it.

**Why it was invisible, measured rather than assumed.** The host mounts a TodoPanel into the
slot `conversation.input.dock` (slot id "todo", order 0). Its own stylesheet gives it:

| property | host value | resolved here |
|---|---|---|
| `background` | `var(--dsw-specific-menu)` | `rgba(248,249,250,0.58)` |
| `backdrop-filter` | `var(--dsw-menu-backdrop-filter)` | **none** |
| `box-shadow` | `var(--dsw-elevation-panel)` | **none** |
| `border` | `0` | — |

That is a frosted material built to float over *content* it can blur, separated by the
shadows behind it. On this theme's conversation card — a white surface — 58% near-white over
white composites to white, there is nothing for the blur to blur, and the elevation shadow
resolves to `none`. The bar had no edge of any kind. "Just getting merged in the white
background" is a literal description of the compositing.

**A distinct tone, not a darker wash.** The panel takes `--dsh-bento-card`. That does not
replace the host's material with a similar one; it separates the bar from the card by tone,
which is what every raised surface in this theme does. The host's hairline and elevation are
replaced by ours because neither survives a dark card: `--dsw-alias-border-l1` measures
`rgba(0,0,0,0.04)` and `--dsw-specific-menu` is 58% alpha.

**Both states, one rule.** Collapsed and expanded render the same root element and differ
only by whether the `<ul>` exists — measured 829×36 vs 829×204, same radius, same fill. The
rule targets the container's surface, so it covers both, and no state selector is written
because the element carries no collapsed/expanded attribute to select on.

**The selector is `[data-slot="conversation.input.dock"] > *`, and it matches exactly one
element** — verified, not assumed: `matchedByRule === 1` of `dockChildren === 1`. The slot
anchor is host-written, so no CSS-module hash appears here.

**Not changed, deliberately.** No gap or margin was added: the dock already has the host's
own inset separating it from the composer, and the request was the surface. No size changed
either — the panel is still 36px collapsed and 204px expanded, and the header row is still
24px.

**Proof it is visible, not just computed.** The host's material was forced back over the
panel and the region screenshotted before and after, then compared pixel by pixel: **61% of
pixels changed in light, 66% in dark.** Computed style says what was applied; only pixels say
what is on screen, and both were needed here because the "before" state *had* a fill and a
shadow that simply could not be seen.

---

## D63 — Accent and label colour become choices, not switches

**Decision.** Two new selectors in the Bento layout tab. **Accent** picks one of eight, blue by
default. **Label colour** follows that accent by default and can be overridden per theme.

### The accent is exactly two host tokens, and that was measured

The obvious assumption is that one accent token drives everything accent-coloured. Probed one
token at a time against every accent surface on the page:

| token | what it moves |
|---|---|
| `--dsw-alias-state-business-primary` | nav selected fill, nav selected ink, row selected fill, row selected ink |
| `--dsw-alias-button-info-fill` | the Send button |
| `--dsw-alias-link` | nothing on the surfaces measured |
| `--dsw-alias-state-business-tertiary` | nothing |

So the accent is **two** tokens. An accent that moved only the first would be visibly
half-applied — a teal app with a blue Send button — and the second would be missed by anyone
who only checked the selection state.

**This took three probes to get right, and the first two were wrong.** The Send button appeared
to ignore every token, and even a direct `!important` background changed nothing. The cause was
`transition: background-color .1s`, which the host sets on that button: `getComputedStyle`
returns the *current animated* value, so reading immediately after injecting a rule returns the
old colour. Every "Send ignores the accent" result was that artifact. Measure after the
transition, or the measurement lies.

### Everything else derives, and that was measured too

The selection tint and ink are `color-mix()` expressions over the accent token (D55), so
overriding the accent moves them automatically. The question is whether that derivation stays
readable for accents other than blue. Computed for all eight accents in both themes:

- worst derived ink on its own tint: **5.90:1** (teal, light) — AA asks 4.5
- worst accent-as-icon on the card: **3.74:1** (teal, light) — UI asks 3

**A hand-written ink table was written first and discarded.** It looked reasonable and measured
**1.20:1** for amber in dark and **1.24:1** for rose: on a dark tint, the ink has to *lighten*,
and the table had invented darker values by analogy with the light theme. The derivation was
right and the invented numbers were wrong. The palette therefore carries **no ink at all** — two
hex values per accent, light and dark, and the theme derives the rest.

### The label colour: automatic, or overridden per theme

"Each accent comes with its own text colour, but we need the ability to change it as well" is
two requirements. Modelled as two states:

- **Auto** — the theme's own derivation. Stays correct when the accent changes.
- **Custom** — a hex value stored per theme. Per theme because a colour that reads on a light
  tint usually does not on a dark one, which is the exact failure that made the discarded table
  unusable.

Storing "auto" as the current derived literal would have been simpler and wrong: a later palette
tweak would silently keep the stale colour.

### Kernel: a third feature shape

The kernel understood two things, a switch and a runtime `setup`. An accent is neither — it is a
**value**. So the feature contract gains `choice: true`, plus `options` (a fixed palette) or
`store: 'json'` (free-form), and the kernel gains `choice(id)` / `setChoice(id, value)`.

Three points where that had to be careful:

- `paint()` previously painted only features whose switch was on. A choice has no switch, so its
  `css` is now a **function of the current value** and is always painted. The two contracts stay
  distinct rather than being conflated into "empty string means off".
- `readChoice` validates against the option list on read. `localStorage` is user-writable, and a
  stale id from an older palette would otherwise paint nothing with no visible error.
- The JSON shape validates to `#rrggbb` at the boundary, so a malformed record cannot be emitted
  into the stylesheet as a CSS value.

### The palette is the one place literals are allowed

`verify.mjs`'s "no hardcoded colour" gate exempts `16-palette.js` **by filename**, and a new
gate takes over for it: it recomputes each accent's tint and ink with the theme's own mixes and
fails the build if any drops below AA or below 3:1 as an icon. The exemption is not an
unguarded hole; it is a different guard for a different kind of data — a user-chosen accent is
meant to be a fixed value, which is precisely what the original rule forbids for surfaces.

### Swatches are true circles, and that took a grid to settle

The host sets `corner-shape: superellipse(1.5)` and it **inherits**, so a 999px radius drew
squircles. Rendering a grid of exponents in this build:

| corner-shape | result |
|---|---|
| inherited 1.5 | over-rounded square |
| **round / superellipse(1)** | **circle** |
| 1.5, 2, 3, 4 | progressively squarer |
| 0 / bevel | a **diamond** at this radius |

`round` is not honoured as a distinct keyword here — it computes to `superellipse(1)`. The rule
states the exponent explicitly so the intent survives a keyword alias. It cannot be set from the
renderer: React drops unknown CSS properties, measured — the span kept inheriting 1.5 from its
button. So it lives in the stylesheet.

**The owner chose circles over the host's squircles**, knowing the host's own round controls
(Send, attach) are squircles too. Recorded because it is a deliberate departure.

---

## D64 — The dark band above the composer is the host's scrim, redirected to the card tone

**Decision.** The host's sticky composer-seat gradient now fades to the card tone instead of the
host's page background. Scoped to the centre column and gated on the host's own active phase, so
with the theme off the host's paint is untouched.

**What it actually was.** Not this theme's paint, and not a shadow. Once a conversation is
active the host applies to its composer seat:

```css
.wSkVaW_root[data-phase=active] .wSkVaW_composerSeat {
  position: sticky; bottom: 0; z-index: 7;
  background: linear-gradient(180deg, transparent 0px, var(--dsw-alias-bg-base) 36px);
}
```

A scrim so content scrolling under the composer fades instead of being cut off. It fades to
`--dsw-alias-bg-base` — the host's flat page background — which assumes that is the surface
behind it. Measured:

| theme | bg-base | our canvas | our card |
|---|---|---|---|
| light | `rgb(255,255,255)` | `rgb(235,238,242)` | `rgb(255,255,255)` |
| dark | `rgb(21,21,23)` | `rgb(27,27,28)` | `rgb(44,44,46)` |

In **light** bg-base equals the card, so the scrim is invisible and there is nothing to fix. In
**dark** it is 23 units darker than the card, and measured down the strip the card ran
`44,44,46 → 21,21,23` over 36px. That is the band, and it is why it only appears in one theme.

**`transparent` is not the same colour as the card.** The rule keeps the ramp and changes only
its destination. Writing `linear-gradient(..., transparent, var(--dsh-bento-card))` would
reintroduce the bug in miniature: CSS interpolates toward the `transparent` keyword as
transparent *black*, so the ramp would darken on its way to the card tone. The first stop is
therefore `color-mix(in srgb, var(--dsh-bento-card) 0%, transparent)` — transparent, but carrying
the card's colour — so the ramp is purely in alpha.

**The fade still works.** Checked arithmetically rather than by hoping: the ramp is 0 → 1 over
36px in both the host's version and ours, so a contrasting block under the seat is still fully
visible at the top of the ramp and fully hidden at its bottom. Only the destination colour moved.
Removing the gradient would have "fixed" the band by breaking the reason it exists.

**Why this took several probes.** An empty conversation never enters `data-phase=active` — it
stays in `hero` — so the gradient does not exist in a clean profile, and the first three probes
found nothing because nothing was there. The band only renders with real content. Forcing the
phase was the step that exposed it.

## D65 — Gate 25: a backtick in CSS *content* escaped all 24 existing checks

Not a feature decision, recorded because it is a guard defect.

The project has a gate for backticks inside CSS **comments**, written after that bug recurred
several times. It does not cover CSS **content**. This turn a backtick written in prose that had
already been converted to single quotes ended up inside a declaration block, terminated the
template literal, and **all 24 gates passed**: the bundle still parsed, because the remainder
read as an identifier expression, and the stylesheet was silently truncated. The truncation was
only caught because the build also reported a parse error in that same run — by luck of where the
stray text landed.

Gate 25 closes it: it locates every `*_CSS` template literal, finds the first closing backtick
after the opening one, and requires a semicolon immediately after it. A literal that closes
mid-statement fails. Proved on two plants — a backtick in a comment inside the literal, and one
in a CSS declaration — and both were seen red before the gate was trusted.

---

## D66 — The preset-card header wraps instead of truncating, and it was never an overlap

**Reported as** "the mode selectors are overlapping in the settings". **Measured:** nothing
overlaps. No pair of header elements intersects in any of the four cards, in either theme, at any
width. What actually happens is the card TITLE ellipsises — "Standard mode" renders as
"Standar…" — because the header row runs out of width.

**The host's header is one flex row** inside each preset card:

```
span.cardIdentity  (flex: 1, gap: 6)  [ span.cardName  |  span.tag ]
code.cardId        (flex-shrink: 0, max-width: 35%)
```

The identity gets whatever is left after the id, and the tag is a sibling that does not shrink.
Measured inside one card at 1600px:

| | px |
|---|---|
| identity available | **184** |
| name needs ("Standard mode") | 111 |
| gap | 6 |
| tag needs ("New task default") | 105 |
| **total needed** | **222** → 38 short |

38px short, so the name ellipsises and the tag sits over the truncated remainder. It reads as
overlap because the bold black tag lands right where the text stops.

**This is the host's layout, not the theme's — and proving that changed the fix.** With the theme
switched off the name is *still* truncated: 75px available, 104px needed. The theme widens the card
from 276 to 300px, which does not close a 38px gap. So the theme is correcting a defect it did not
introduce, and the correction must not depend on the theme's own padding.

**Widening the window does not help.** The host's grid is
`repeat(auto-fill, minmax(268px, 1fr))`, so a card is ~276–300px at any viewport. Measured at
2200px: identity still 184px, still truncated. Anyone meeting this would reasonably try a bigger
window first and find it does nothing.

**Decision: let the row wrap.** `flex-wrap: wrap` drops the tag to its own line when the row cannot
hold all three, so the name takes the full width. Measured: 111 of 111 needed, no ellipsis, at
1600px and 2200px, light and dark.

**The alternative was rejected for moving the defect, not fixing it.** Letting the tag shrink and
ellipsise keeps one line but starts hiding tag text — the same problem relocated to the label that
says which mode is the default.

**Blast radius is two cards.** Only the cards carrying a tag grow (189 → 212px); Minimal and
Creator are unchanged at 189px. A fix that grew all four would have been a layout regression
traded for a truncation.

**`row-gap: 4px` is the only new spacing.** The host's `gap: 6px` becomes the column gap when the
row wraps, and a wrapped row needs its own line gap. 4 rather than 6 so the tag sits closer to the
title it labels than to the description below it.

---

## D67 — The queued-message tab becomes the composer's top segment

**Reported as** "the queue message box has weird rectangle around it". Measured, it was three
separate mismatches, not one:

| | host value | composer (this theme) |
|---|---|---|
| width | **829px** (dock 845 − 8px padding each side) | **861px** |
| left edge | inset 8px | flush |
| fill | frosted menu material → `54,55,59` dark | card `44,44,46` |
| outline | 0.5px `--dsw-alias-border-l1` on `::after` | none |

So it was a box 16px narrower than the composer, inset 8px on both sides, a shade *lighter* than
the surface under it, with its own hairline. That exposed strip of card around it is the rectangle
the report describes.

**None of those values is wrong on the host's own composer.** A frosted tab with a hairline is a
normal floating treatment over a flat white composer. They became wrong when D61 made the composer
a white raised card with a 28px radius: a narrower, lighter, outlined box sitting on top of a card
reads as a mistake, not as a stack.

**Decision: the tab joins the card.** Full width, the card tone, the composer's own top radius, no
backdrop, no outline. The host already places it flush — its own margin-bottom is
`calc(0 - stack-gap - 3px)`, measured −9px, putting the panel 1px *into* the composer's top edge —
so nothing had to move to make the two read as one surface.

**The width took two attempts, and the miss is instructive.** Removing the dock's `padding-inline`
alone left the panel at 845px against 861px. The dock's own rule is:

```css
width: calc(100% - side-clearance*2 - dock-inset*2);
padding: 0 dock-inset;
```

The padding was only half of it — the width itself still subtracts 8px of side-clearance each side.
Both custom properties are zeroed on the dock rather than overriding `width` with a literal, so the
host's own calc still runs and still tracks whatever the composer's max-width turns out to be.

**The radius is read from the host's token.** The composer card takes `var(--dsw-radius-panel)`
(measured 28px), not the theme's 20px tier. A 20px top corner under a 28px composer would be
visibly tighter on the same silhouette, so the tab reads the same host token.

**The multi-row state was checked separately.** With several messages queued the dock gains a
header button with its own 12px radius and a chevron. That header keeps its radius — it is a
control inside the panel, not the panel's curve — and the panel's `overflow: hidden` still clips
the list, verified with three rows.
## D68 � The cell inset is a separate number from the gutter, and the header is compensated for it

Reported as "the spacing feels kind of congested". Congested is not a number, so the first job was
to find the number � and the measurement that mattered was not the vertical rhythm at all.

**The finding.** The settings row rule used ONE number for two different jobs:

```css
margin-inline: calc(-1 * var(--dsh-bento-gutter));   /* how far the hover fill reaches */
padding-inline: var(--dsh-bento-gutter);             /* where the text starts */
```

With both at 12px the text inset could never be anything but the gutter. Measured at 826x810 (the
owner's own viewport) and at 1600, light and dark, on the shipped build: **text inset 12px against a
card radius of 16px**. The first glyph of every label started inside the corner arc of the card it
sits in. That is the concentric law read backwards � not "inner rounder than outer", which is the
defect the theme had already fixed once (D54), but "content closer to the edge than the edge's own
curve", which nobody had checked.

**The decision: two numbers, one token.**

```
--dsh-bento-gutter:      12px   space BETWEEN two boxes
--dsh-bento-cell-inset:  16px   space INSIDE one box
```

The fill still bleeds exactly to the card edge (the margin stays at the gutter, so hover is
unchanged); the text insets by the cell inset. Measured after: text 16, control right-edge 16,
symmetric, card radius 16.

**16 is derived, not chosen.** The bento cell rule is "padding inside a cell sits close to the gap
between cells, or slightly above it", and the gap between our cards is 24 � but the Settings content
column cannot afford 24. The host's Appearance control is three buttons with a 180px flex basis, so
3x180 + 2x8 = 556px must fit inside the row. Measured at 1600:

| inset | row inner width | tile width | slack |
|---|---|---|---|
| 12 | 564px | 183px | 8px |
| 14 | 560px | 181px | 4px |
| **16** | **556px** | **180px** | **0px** |
| 18 | 552px | 272px, 2 lines | wraps |

So 16 is the largest inset that keeps the widest control on one line, and it happens to equal
`--dsh-bento-radius-nested` � the other half of the same rule, since content must not start inside
the arc of the corner it sits in.

**The second defect, found while measuring the first.** The content column is two stacked regions: a
fixed header strip (the "Open configuration file" button and the close X) and the scrolling options
area. The card is painted on a pseudo-element inset 12px inside that column, so anything whose
padding was written against the COLUMN edge lands 12px closer to the card edge than it reads. The
host's header padding is 20/14/8/10. Measured: **the close button sat 2px from the card's right edge
and 8px from its top**, inside a 16px-radius card � the tightest space in the panel and the first
one the eye reads as cramped. It is now 12 + 16 = 28 on the top and right, and 4 on the bottom so the
header grows only 54 -> 58px and the options area does not lose a row.

**The first attempt at the header rule leaked, and the sweep caught it.** Written as a descendant
match on `[class*="header"]`, it matched **two** elements on the Built-in plugins tab: the dialog's
own header, and a plugin card's inner `headerEnd`. Walking all 6 tabs is what found it � the General
tab looked perfect. The rule is now a direct-child combinator, verified at exactly one match per tab.

**What is NOT claimed.** The vertical rhythm (16px block padding, 32-39px text-to-text) was measured
and is not below the 4px rhythm; it was left alone. "Congested" was horizontal, and moving a vertical
number that measures fine would have been taste dressed as a fix.

**The Appearance wrap at 826px is the host's own defect, proven, not introduced here.** At that width
the un-themed host row is 542px against 556px needed, so "System" wraps with **no theme loaded**.
Measured three ways at the same viewport � theme off, theme with the old 12px inset, theme with the
new 16px inset � and all three wrap. The theme narrows the row by 8px there (542 -> 534); it does not
create the wrap. Recorded rather than fixed: the fix is a host change (a smaller flex basis or a
2-up breakpoint), and clamping the inset responsively to chase it would trade a real inset at every
normal width for a cosmetic gain at one narrow width.
## D69 � The card tier is 24, the pill is a tier, and the detail page becomes a board

Phase 1 of the plugin-detail reference. Three changes, one of which reverses a value this file
argued for.

**1. The card radius is 24, not 20.**

D9 chose 20 because it is the host's own top-of-scale value (`--dsw-radius-xl`), on the reasoning
that a card should agree with the shells around it. The reference settles it the other way: its tray
is 24 and its nested cell 18, and the board reads calmer for it. 24 is also the published bento value
(Apple ~24, Arc ~24) rather than an app-panel value.

This is the first time the theme has overridden the host's top radius, so it gets a gate: card must
exceed inner, the pill must exceed card, and the nested tier must still equal 28 (host panel) - 12
(gutter) = 16. That last one is the trap. `24 - 12 = 12` looks like it should be the new nested
value, and it is wrong: the nested tier is derived from the **28px host Settings panel**, not from
our own card. A planted "correction" of 16 -> 18 passed the first version of the gate, which only
asserted `nested < card`; the gate now recomputes the derivation and fails on it (proofs in �gate).

**2. The pill is a tier, not a literal.**

The reference uses 999px on every chip, badge and count. The host's own version and status tags
already compute to 999, so this is mostly a naming job - but it belongs in the token layer for the
reason D45 established: no untokenised radius at a call site. A gate fails the build on a bare
`border-radius: 999px` anywhere in `src/`.

**3. The plugin detail page becomes a board (`detail-board`, order 17).**

The page exists in the host already. It renders `_detailTop` (crumb + icon + actions),
`_detailMain` (title, tags, package, description) and `_detailSections` as three siblings in a flex
column at 960px. The feature turns `_detailSections` into a two-track grid, gives each section a
cell, lets the list section span both tracks, and paints the hero.

**THE HERO COST TWO ATTEMPTS AND THE FIRST ONE TAUGHT THE REAL LESSON.** The hero is not one box:
the icon row is `_detailTop` and the title is `_detailMain`, and they are SIBLINGS. The first draft
painted `_detailTop` only. Every computed value was correct - radius 16, background set, accent
border set - and the result was a small panel holding an icon and a switch, with the plugin's name
floating underneath it outside the box. The numbers could not see it; the screenshot could. The panel
is now painted on `_detail` (selected with `:has(> _detailSections)` so it cannot leak), and the
verify harness gained a **geometry** assertion - the panel must CONTAIN the title - because value
assertions passed on a visibly broken result.

**Width needed two fixes.** A negative inline margin pushed the panel to 1000px inside a 960 column
(clipped by the page). Replacing it with padding produced 1002px, because the host's reset does not
apply `box-sizing: border-box` to this element. It now declares `box-sizing` explicitly, which is
the difference between "the padding is inside the box" and "the padding is added to the box".

**Two structural traps, both measured.** `[class*="_detailSection"]` also matches
`_detailSections` - the substring contains it - so the board would have received a cell's padding;
the board is addressed by its own name and sections as its direct children. And `[class*="_row "]`
with a trailing space matched **0** elements, because the host's row class has nothing after it in
the class list; rows are reached through the `_rows` wrapper instead.

**What was NOT changed, and why.** The section-count chip, version tag and status tag were already
999px pills from the host - they are re-declared through the token for ownership, not re-styled. The
list page is untouched: it already has its tile treatment from `page-rows`, and a grid there would
reflow every card. And the account-settings "Running/Stopped" pill from the reference is not built:
that is a per-plugin enabled state, and the host already renders an "Off" label beside each row.

**Verified** (both themes, 1600x1000): every painted card reads 24; the session age is a 14px pill
with a chip background and inverts correctly on the selected row; the detail hero contains the title
and is exactly 960 wide; the board is a 2-track grid with 16px cells and a full-width list section;
the crumb is a 30px pill; and nothing moved - session rows 34, nav rows 38, composer radius 28,
Settings cards still 16, collapsed rail still 10, zero overflow on sidebar or centre.
## D70 � The detail page gains two sections, and the reference's third tile is refused

Phase 2 of the plugin-detail reference. This is the first part of this theme that **adds DOM** to a
host surface it does not own - every feature before it only repainted the host's own elements - so
the design is shaped by what the extension point actually guarantees.

**The extension point, quoted from the client runner's own slot contract catalog** (111 entries
ship inside `dsh-cordis-client-runner`, machine-readable, so this is documentation rather than
inference):

```
plugins.detail.section   kind: list   scope: root
"Sections under a detail page's own content: after the rows on a bundle's page, after the
 configuration on a row's or an official plugin's page. An entry draws its own section chrome
 and renders null for a subject it has nothing for."
```

Two things in that sentence decide the implementation. *"Draws its own section chrome"* means the
section arrives bare and must style itself. *"Renders null for a subject it has nothing for"* is a
contract obligation, not a suggestion: a component that throws on an unexpected subject would take
the host's detail page down with it.

**WHAT THE SUBJECT CARRIES, measured from the manager's `packageRef`:**

```
{ kind: 'bundle', pkg: { name, version?, installed, availability, official, enabled,
                         rows: [{ rowId, moduleName, enabled }] } }
{ kind: 'item',   id }                       // official plugin pages: no package at all
```

**THE REFERENCE'S UPDATE TILE IS REFUSED, ON EVIDENCE.** It shows "v0.1.0" with a "Check for
updates" button. The host's own `updateAvailable(pkg)` reads `pkg.installTarget` and `pkg.source`;
neither field is in the subject, because `packageRef` deliberately projects a narrow face. A plugin
therefore cannot know whether an update exists. Mounting a button labelled "Check for updates" that
cannot check anything would be a control that lies, which is worse than a missing feature. The same
applies to the reference's Source card: `pkg.source` is absent, and the host's `SourceSection` did
not render on any of three plugins measured, so there is nothing to restyle either.

**WHAT IS BUILT: two sections, both from data the host actually hands over.**

1. **Package facts** - kind, status, source (official/third-party), version, component count as
   `enabled / total`, enabled state. Every value comes from the subject; nothing is invented. On an
   official *item* page the subject has no `pkg`, so the section returns null rather than describing
   a package it cannot see. Verified: 0 renders on the Shell item page, 1 on a bundle page.
2. **Bento layout** - which of this theme's mechanisms are in effect on the page, read from the
   kernel's own feature state, so it cannot claim a feature the user switched off. Verified by
   switching `row-tiles` off: the marks went 4 On -> 3 On + 1 Off.

**Registration order matters, and not for looks.** Both sections are mounted in `apply()` **after**
`kernel.start()` and inside their **own** try/catch. If the slot contract changes in a future
harness, the cost is two sections - not the theme's entire stylesheet. Gate 29 pins that ordering,
the documented slot name, the ids and orders, the per-subject guard, and the guard itself; four
planted defects all fail it.

**THE LAYOUT TRAP, AGAIN IN A NEW PLACE.** The slot's mount point is a `div` with
`display: contents`, so our sections are grandchildren of the board, not children. A `:scope >`
walk reported "0 of our sections on the board" while both were laying out correctly as grid items
at 453px of 918. The check now expands contents wrappers - the same correction L86 recorded for the
queue dock, in a third location, which is the argument for stating it as a rule rather than a
one-off: **a `display: contents` wrapper is invisible to `:scope >` and to every child-count probe.**

**Verified** (bundle page, both themes, 1600x1200): both sections mount exactly once, render real
subject data (Kind Bundle / Status Installed / Source Third-party / Version 0.1.16 / Components
1 of 1 / Enabled Yes), sit as half-width cells in the 2-track board, and produce no page errors. The
item page renders the facts section 0 times, as the contract requires. Phase 1's radii, Settings,
rail and tab checks all still pass.