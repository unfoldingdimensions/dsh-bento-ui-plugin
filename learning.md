# Learning

What cost time, and why. Written so a future session does not pay for it again.
Established 2026-11-03, from building `dsh-bento-theme`.

---

## L1 — I broke the user's app, and the recovery broke their config

**What happened.** The first install aborted application startup. The recovery
dialog's "disable third-party plugins" option rewrote `cordis.patch.yml` from
5278 to 1345 bytes, dropping 13 config rows — including nine model definitions
across two providers, the `web-ui-*` settings, the `dsh-claude-style` config and
`plugin-market`. The app then booted with 17 bundles where there had been 24.

**What made it recoverable.** The recovery wrote a timestamped backup first, and
I compared the restore byte-for-byte before calling it repaired. Without that
backup the model list would have been gone.

**The lesson.** A UI plugin's failure mode is not "the UI looks wrong", it is
"the application does not start". Before installing anything into the desktop
profile, test it where a failure costs nothing.

---

## L2 — Four confident, wrong diagnoses before one rendered screenshot

I said, in order: the missing `main` field was the cause; then the export shape;
then `dsh.client.inject`; then a 404 on the bundle. Each was stated with more
confidence than the evidence supported. Each was disproven by the next check.

What actually found the truth: rendering the page and reading
`getComputedStyle`, the injected stylesheet, and the stamped attributes. Three
real bugs (L3, L4, L5) were visible in one render and invisible in review.

**The lesson.** For CSS and lifecycle-order questions, a rendered page is faster
than any amount of source reasoning. Read the code to form a hypothesis; never to
conclude. Label a hypothesis a hypothesis while stating it.

I also told the user `main` was "probably the culprit", then later had to
supersede that. Saying "probably" did not make it less wrong.

---

## L3 — `apply` mutated a framework-owned object

`ctx.bentoTranslate = makeTranslator(ctx)` threw. Because it ran before the
try/catch and before the settings row registered, the plugin reported `failed`
and *nothing* appeared — the failure was silent to the user in the only place
they would look.

**Fix.** Locals only; each step of `apply` in its own try/catch; register the
settings row **first** so a later failure still leaves a switch to click.

**The lesson.** `apply` is an activation boundary, not application code. Anything
that can throw should be isolated and should degrade to "feature off", never to
"plugin failed".

---

## L4 — Custom properties do not inherit upward

The card painted `transparent`. The stylesheet was correct, the selector matched,
the class was applied, the radius computed — but the surface colour was empty.

Cause: `--dsh-bento-card: var(--dsw-alias-bg-layer-1)` was declared on `html`,
and the host defines `--dsw-alias-*` on `<body>`. A custom property is substituted
**on the declaring element**, so `var()` resolved against nothing, computed to
empty, and painted as nothing. No error, no warning, no console message.

**Fix.** Surface tokens declared on `body`.

**The lesson.** A `var()` chain is only as defined as the element you wrote it on.
When a style silently does nothing, check the token resolved — not just that the
rule matched.

---

## L5 — The plugin activated before the shell existed

The stamping observer attached to `document.querySelector('[data-slot="root"]')`,
which was **null** at activation time. The observer never attached, so no element
was ever stamped, so the feature was never applied. The plugin loaded, registered
its settings row, and did visibly nothing.

**Fix.** Observe `document.body`; stamp on every mutate, idempotently, coalesced
with `requestAnimationFrame`.

**The lesson.** The client half runs before React renders the shell. Any DOM work
at activation time needs a retry or an observer — and the observer must attach to
a node that already exists.

---

## L6 — A backtick inside a CSS comment terminated a template literal

The CSS lives in a JS template literal. Writing `` `body` `` inside a CSS comment
ended the literal early, producing `SyntaxError: Unexpected identifier`.

Caught twice by `node --check` before install.

**The lesson.** In CSS-in-template-literal, backticks and `${` are escape
hazards in *comments too*. A syntax check before install is not ceremony.

---

## L7 — "It works" and "it looks right" are different claims

After all the functional fixes, the sidebar card rendered as **white on
`#f9fafb`** — structurally perfect, visually almost invisible. The generic
`bg-layer-*` aliases are all pure white in this light theme, so a card built from
them is white-on-white.

**Status.** Resolved (D15). The card is now `--dsw-alias-bg-layer-2`, which is
lighter than the canvas in both themes. Measured: light `#fff` on `#f9fafb`
(1.045), dark `#2c2c2e` on `#1b1b1c` (1.235). The light-mode ratio is still
subtle — that is the host's own elevation step and it is what a quiet, flat
interface wants; the edge (1px, 10% black) carries the boundary, not the fill.

**The lesson.** Token discipline gets you a card that follows light/dark and every
theme; it does not get you contrast. Those are separate checks — and the contrast
check has to run in both themes, because a token that is "white" in one is not
necessarily "lighter" in the other (L13).

---

## L8 — The boot audit's state word is the fastest diagnostic

```
loading  → the import promise never settled
failed   → import threw, or apply threw
pending (waiting for service: X) → an injected service never appeared
import failed: <text> → transport/registration/dependency/factory error
```

One word distinguished "hung" from "threw", and that cut the hypothesis space
immediately. Reading it was worth more than the four theories it replaced.

**The lesson.** Before theorising about a plugin that did not activate, get the
host's own state word for it.

---

## L9 — Verify in a browser, and check the settings panel is open

Two verification traps that each produced a false negative:

- **The settings row is not in the DOM at boot.** `settings.general.item` only
  renders while Settings is open. I reported "settings row missing" from a
  closed-panel observation, when the row was working the whole time.
- **A 404 from my own probe was mine, not the host's.** Relative URLs
  (`plugins/??...`), `&amp;` entities in the boot HTML, and cookie auth all had
  to be right before a probe meant anything. I concluded "the bundle is not
  served" from a broken probe; the bundle was being served correctly.

**The lesson.** When a probe disagrees with the product, suspect the probe first,
and confirm by comparing against a known-good control in the same run.

---

## L10 — What the reference plugin actually taught

`dsh-claude-style` (774 KB, mature) validated the approach and marked the edges:

- It never touches track geometry; it paints columns and gives elements their own
  edges. The drag handles are absolutely positioned at computed x offsets, so
  track changes break resizing.
- It stamps its own `data-*-part` attributes at runtime — confirming there is no
  stable host selector to rely on.
- It scopes every rule under one body attribute and reads only alias tokens,
  which is why one stylesheet survives every theme.
- Its storage of fact: a 68 KB style spec and a version-pinned contract. That is
  the true maintenance cost of restyling someone else's DOM, and it is worth
  stating plainly to anyone considering it.

**The lesson.** A mature plugin's *constraints* are the valuable part of reading
it — more than its features.

---

## L11 — Cost of this session, honestly

- Roughly four wrong diagnoses before the first render.
- One application-level outage and a destructive config rewrite, both recovered
  and both verified.
- At the end of the first session the theme activated and painted but had **not**
  been confirmed visually acceptable, and that was stated as open. **Resolved in
  the Settings-board session** (D15, L12, L13): the surface pairing was corrected
  for dark mode, the contrast is now measured in both themes, and the Settings
  panel is verified in light and dark across all five sections.

**The lesson that generalises beyond this plugin.** Static evidence — the file
exists, the slot registered, the install reported `applied` — is not evidence
that the user's experience changed. Only the rendered result is. Every time this
session substituted a weaker signal for the real one, it produced a wrong claim.

---

## L12 — Insetting a dialog narrowed a control the host had already sized to fit

Building the Settings board, the first version gave the content column
`margin: 8px` to inset the card. It looked right in the CSS and rendered wrong:
the Appearance control's third cube ("System") wrapped onto a line of its own.

Measured cause: the content column went from **612px to 596px**. The Appearance
row is three cubes at `flex: 1 1 180px` with an 8px gap inside `flex-wrap: wrap`,
so it needs 3×180 + 2×8 = **556px** inside a **564px** row. Taking 18px away
left 546px for a 556px control, and the wrap fired.

**Fix.** Paint the card on a positioned pseudo-element (`::before`, `z-index: -1`)
instead of insetting anything. The column keeps the exact box the host solved, so
no control can reflow.

**The lesson.** In a dialog the host has already laid out, a theme must **paint,
not resize**. The dangerous changes are not the visible ones; they are the ones
that shave a solved box below a wrapping threshold — and the margin that did it
was 8px, which looked like a small, safe design choice.

---

## L13 — A dark-mode token that is "the lighter one" is not the lighter one

The card was built on `--dsw-alias-bg-base`, which is `#fff` in light mode and so
reads as raised. In dark mode the same token is `#151517` while the canvas is
`#1b1b1c` — the card came out **darker than its background**, so the layering
inverted and the card looked like a recess.

My own contrast script said `NaN` for two of these rows and I nearly read past it
(an unparseable value is a failed measurement, not a pass). Rerunning it properly
gave the real numbers: `bg-base` 1.060 (darker), `bg-layer-2` 1.235 (lighter).
`bg-layer-2` is the tone the host itself paints the Settings panel with.

**The lesson.** Verify a surface token in **both** themes before believing it is
"the raised one". Light mode cannot tell you the direction of the layering in
dark mode. And when a measurement returns something unparseable, that is a
finding, not noise.

---

## L14 — I wrote a gate that passed a violation, then nearly wrote one that failed a clean tree

Two bad gates in a row, on the same bug:

1. **False positive.** I grepped every `/* */` block for a backtick. But JSDoc
   blocks legitimately contain backticks (naming functions), so the check failed
   on a clean tree. A gate that cries wolf gets deleted, not fixed.
2. **False negative.** I rescoped it to look only inside template literals and
   then planted the violation — and it **passed**. The reason is uncomfortable: a
   stray backtick in a CSS comment often leaves the bundle as *valid JavaScript*.
   The rest of the comment becomes an identifier expression, the next backtick
   opens a new literal, and `node --check` is happy while the stylesheet is
   silently truncated.

**Fix.** Check the artefact, not the intent: every `*_CSS` literal in the built
`client.js` must have balanced braces and end on a closing rule. Plus a scoped
source check that skips JSDoc. Both were proved by planting a violation and
watching them name the cause (`backtick in CSS comment at 15-tokens.js:29`,
`literal at line 52: 2 { vs 1 }`).

A third mistake in the middle of this: my PowerShell plant used a double-quoted
string, so the backtick was consumed as an escape and the "violation" never
reached the file. The gate looked clean-green against a file with no bug in it.
**A test planted wrong proves nothing** — verify the plant landed before reading
the result.

**The lesson.** "I wrote a check and it passes" is worth nothing until the check
has been seen failing on the defect it exists to catch. And when a fix must be
proved by planting a fault, confirm the fault is actually present.

---

## L15 — A visual impression is not a measurement

Looking at the finished Settings screenshot, I saw grey bands across several rows
and concluded the hover fill was stuck on. Reading `getComputedStyle` for all 14
rows returned **zero** tinted rows. Convinced the measurement might be the
problem, I read the PNG's own pixels: at every scanline across the card the modal
colour was `rgb(255,255,255)`. The "bands" were anti-aliased text at that zoom.

**The lesson.** Two different evidence sources, used deliberately: computed style
answers "what did the browser apply", the screenshot's pixels answer "what is
actually on screen". When they seem to disagree, read the pixels before changing
code — and when they agree, stop looking. Neither the eye nor the stylesheet gets
the last word alone.

---

## L16 — Counting the wrong thing, twice

Two counting errors that each produced a wrong statement:

- **Row count.** I reported the desktop patch as "27 rows" and briefly alarmed
  myself; it is **18 top-level entries**. The 27 included `- id:` lines nested
  inside `insert:` blocks, which are children of a row, not rows. The correct
  check is `(?m)^- id:` at column 0.
- **Bundle bytes.** `build.mjs` prints the *fragment* byte count, while the file
  carries a banner on top, so the two numbers never match. I read that difference
  as a changed file.

**The lesson.** When a number surprises you, check what it is counting before
reacting to it. A verification figure is only meaningful with its unit and its
scope stated.

---

## L17 — What the Chrome-first loop actually bought

The session's original process was reasoning-first, and it produced four wrong
hypotheses (L2). The Settings redesign was done measure-first, and it produced:

| Found by measuring | Would have shipped if only reasoned about |
|---|---|
| the Appearance control wrapping (L12) | a broken control on the most-used settings tab |
| the card inverting in dark mode (L13) | a design that looks wrong in the theme a user picks for comfort |
| my own selector assumptions being wrong | rules that silently match nothing |

Each was found in a single render-and-measure cycle, before the desktop profile
was touched. The original defect (D4) took an application outage to find.

**The lesson.** The order is the whole value. Probe the DOM, prove the selectors,
render, measure, and only then install. Written up as D12 and `flow.md` §2.

---

## L18 — The card was never low-contrast; it was covered

For two sessions this project carried an open issue: "the sidebar card is white on
`#f9fafb`, contrast too weak to call done" (L7). I chased it as a colour problem —
tried `bg-layer-1`, then `bg-base`, then `bg-layer-2`, and finally declared the
light 1.045 ratio "subtle by design".

It was not a colour problem. The host's own sidebar content root
(`hHd-Xa_root`) paints an **opaque `#f9fafb` rectangle, 280px wide, with
`border-radius: 0`**, directly on top of the card. The card was only ever visible
as the 8px gutter ring around that rectangle. The interior I kept measuring was
the host's background, not mine.

Found only when the canvas turned cool blue-grey and the screenshot showed the
sidebar staying warm `#f9fafb` while the frame around it went `#ebeef2` — a
mismatch that no computed-style check on the *card* would ever have revealed,
because the card's computed colour was always correct. The lie was in what painted
over it.

**The lesson.** "The style is applied but looks wrong" and "the style is applied
and is hidden by something above it" produce nearly identical computed-style
output. The distinguishing evidence is a **pixel scan of the rendered result**
plus a walk of every opaque descendant wider than the thing you painted. I had
both tools and used neither on this question for two sessions.

**Cost.** Two sessions of colour tuning that were never going to work.

---

## L19 — A test harness bug looked exactly like a design failure

While testing the dark-mode canvas, the result came back showing the canvas still
at the old colour. I nearly recorded "the token override does not apply in dark
mode" as a finding — which would have been a false constraint baked into the
design docs.

The cause was in my own script: I concatenated the canvas override onto the
previous CSS block with a leading `;`, producing an empty declaration. The
override never parsed. Isolated in a clean page, the same override applied
correctly on the first try.

**The lesson.** This is L9 again and it keeps recurring: when a probe disagrees
with the product, suspect the probe first. The cheap control is to test the
suspicious rule **alone**, on a clean page, before concluding anything about the
product. Here that control would have taken one minute; not doing it nearly cost
a wrong entry in `architecture.md`.

---

## L20 — Selecting on a class-name fragment, deliberately (**superseded by D20**)

> **Superseded.** This entry argued that `[class*="_root"]` was an acceptable
> scoped exception. Pass 2 found a **structural** selector that needs no class name
> at all (`> * > *`, see D20/A10), and it matched one element where the fragment
> matched twenty-five. The reasoning below about *which* fragile selectors are
> acceptable still holds; the example it is applied to does not.

The theme uses a class-matching selector to reach the host's two content roots.
That contradicts D3 ("reach the shell by runtime stamping, not by selector
guessing"), so it is worth stating why the exception is acceptable rather than
pretending it is not one.

The distinction: `_root` is a **CSS-module stem**, not a full hashed name. The
hash prefix changes (`hHd-Xa_root`, `wSkVaW_root`) but the stem survives, and the
selector is always scoped under this plugin's own stamped part attribute. It
degrades safely — if the stem ever changes, the rule simply stops matching and the
card reverts to being covered (a cosmetic regression), it does not break layout.

That is a different risk class from naming `pI_x6G_sidebarCol` outright, which
would either match nothing or match the wrong element after an update.

**The lesson.** A fragile selector is acceptable when its failure is cosmetic and
self-isolating, and unacceptable when its failure is silent and wrong. Say which
one you are choosing.

---

## L21 — A structural selector beat the class fragment I had already proposed

L20 argued that `[class*="_root"]` was an acceptable scoped exception. It was, but
it was the wrong tool: because the column's DOM child is a `display: contents`
anchor with no box, the root is reachable as `> * > *` — pure structure, no name.

The difference is not academic. The fragment selector matched **25 elements** in
the sidebar (every nested `_root` in the tree); the structural one matches
**one**. On a tree I do not own, the narrower selector is the safer one, and the
broad version would have cleared fills inside the session list the host meant to
keep.

**The lesson.** Before reaching for a name fragment, draw the actual parent/child
chain. "There is no stable selector" is a conclusion that deserves the same
scepticism as any other — here the stable selector was structural and had been
there all along.

---

## L22 — The pointer's resting place produced two false alarms

Verifying hover and focus, two probes came back wrong and both were mine:

1. **"Two rows are tinted — the hover is leaking."** The pointer had been left
   where a previous script moved it, and the second tint was the host's own
   *selected* row (`YDXeBa_selected`). Parking the pointer at empty space first
   showed seven rows and exactly one tint.
2. **"Focus does not work."** `element.focus()` returned `activeElement !== row`,
   so I was about to record a regression. The rows are `role="treeitem"` divs with
   no `tabindex` — **the host never made them focusable**. The theme's
   `:focus-visible` rule therefore cannot fire, and never could. That is a
   pre-existing property of the host's markup, not something pass 2 broke.

**The lesson.** A stateful probe carries state between steps. Reset the input
(the pointer, the focus, the scroll) before measuring, and when a state is absent,
first ask whether the *host* ever provided it before blaming the change.

---

## L23 — What pass 2 cost, and what it fixed

One file, 24 lines of CSS, two gate catches (the backtick check fired on my own
comment), and about an hour.

It fixed the defect that had been open across two sessions and was recorded as a
cosmetic colour problem. The pixel evidence after the fix:

```
light, y=450:  canvas 12px | CARD rgb(255,255,255) 254px | canvas 12px
dark,  y=450:  canvas 12px | CARD rgb(44,44,46)    254px | canvas 12px
```

**The lesson, and it is the same one as L18 from the other side.** The fix took
minutes; finding it took two sessions, because the wrong question ("which colour
is right?") was cheaper to ask than the right one ("what is painting on top of
it?"). When a style is applied and correct but the result is wrong, the question
is never *what value*, it is *what layer*.

---

## L24 — I copied a working selector into a column that is shaped differently

Pass 2 found a clean fix: `> * > *` reaches the sidebar's content root. Pass 3
needed the same thing for the conversation column, so I wrote the same selector.

It matched a **zero-width second anchor**, did nothing, and left the root opaque
over the card. The card's own computed style was perfect the whole time — which is
precisely the failure mode L18 had just documented, and I walked into it one pass
later by copying instead of measuring.

The two columns are not the same shape:

```
sidebar:  column → anchor → root                 (> * > * works)
centre:   column → anchor → anchor → root        (> * > * hits the second anchor)
```

**Fix.** `:not([data-slot])` — anchors carry a slot attribute, the root does not,
so the rule skips an anchor at any depth instead of being pinned to a count.

**The lesson.** "The same problem" is a hypothesis, not a fact. Two regions that
render the same kind of thing can sit at different depths, and a selector that
proves one says nothing about the other until it is measured there. Check that the
rule matched the element you intended, not just that the rule is present in the
sheet.

---

## L25 — Two backtick catches in three passes

The backtick gate fired twice during this redesign (pass 2 and pass 3), both times
on a CSS comment I wrote while explaining the host's DOM. Both were caught before
install, both cost one edit.

That is the gate doing exactly its job — and it is worth noting *why* it keeps
firing: the comments that describe this plugin most usefully are the ones quoting
CSS and DOM selectors, which is exactly where a backtick wants to appear.

**The lesson.** The rule is not "be careful", it is "the gate is cheap and the
error is silent". Writing the comment naturally and letting the gate stop it is
cheaper than contorting the prose to avoid a character.

---

## L26 — Reporting a failure I did not cause, and saying so

Opening a session in the test instance showed a red error block: the session log
contains an event type this harness build does not know. It looks alarming and it
sits inside the very column pass 3 had just changed.

It is not ours. It is a session-log version mismatch between harness builds, it
renders in the host's own error styling inside the host's own content area, and it
reproduces without the plugin installed.

**The lesson.** When a failure appears inside a region you just changed, the
temptation is either to claim it or to quietly not mention it. Both are wrong.
Reproduce it without the change, state which it is, and record the reproduction so
the next session does not re-investigate it from scratch.

---

## L27 — A constant declared in the later file, read by the earlier one

I put `ROW_ATTR` in `60-settings.js` because that is where the rows are rendered,
and used it in `50-feature-settings.js` because that is where the stylesheet is
built. Fragments concatenate in filename order, so 50 runs first and the stylesheet
string is assembled **at module scope** — before 60 has initialised anything.

```
web boot: 1 entry did not activate
dsh-bento-theme: import failed: Cannot access 'ROW_ATTR' before initialization
```

The app did not boot. This is the same failure class as D4: an import-time throw
takes the whole application down and reports the plugin as failed, which is the
most expensive way for a plugin to be wrong.

**Fix.** The constant moved to the prelude, and `verify.mjs` now checks fragment
ordering statically so the next occurrence is caught before an install rather than
after.

**The lesson.** "The obvious place to declare it" and "the place it must be
declared" are different answers when a build step concatenates files into one
scope. The rule here is now explicit: anything read at module scope by a
lower-numbered fragment lives in the prelude.

---

## L28 — A gate that flags twelve false positives is worse than no gate

My first version of the ordering check scanned for any identifier read before its
declaring fragment. On a clean tree it reported twelve violations — `frame`,
`roles`, `title`, `kernel` — every one a **function-local** variable in a
different function, matched because I was comparing names, not scopes.

I narrowed it to declarations at exactly four spaces, the fragments' module-scope
indent. That passes clean and still catches the real bug.

**The lesson.** This is the second time a gate of mine has been the problem rather
than the code (L14 was the first). The pattern is the same both times: I checked
whether the gate was *green*, not whether it was *right*. A noisy gate trains
people to ignore it; a silent one trains them to trust it. Both need a planted
failure to prove they work, and both need a clean-tree run to prove they do not
fire wrongly.

---

## L29 — The host's section chrome comes from the host's section content

The plugin tab rendered its rows flush against the card's top edge, and my first
guess was wrong twice:

1. First I thought the panel needed a wrapper for *horizontal* inset. It did —
   measured rows at x=520 where the host's sections start at x=532.
2. Then the rows were still flush *vertically*. The wrapper had not fixed it
   because the cause was different: the options area is `padding: 0 24px 24px`,
   with **no top padding at all**.

The host's own sections get away with that because each one opens with a title or
intro block. A plugin section opening straight into rows has nothing to supply the
offset.

**The lesson.** When you render into someone else's container, you inherit the
container's box and **not** the chrome their own content happened to provide.
Whatever offset their content created, your content has to create for itself. The
telltale is a measurement that equals the container's own coordinate — a first row
at exactly the options box's y is not a coincidence, it is the absence of padding.

---

## L30 — Inline styles silently beat the stylesheet, so the "fixed" padding never applied

The plugin tab's labels sat exactly on the card's left border. I had already
written the CSS that should prevent it — the board gives rows a negative inline
margin and an equal `padding-inline` so the hover fill can bleed to the card edge
while the text stays on the host's inset.

It never applied. The row also carried an inline `padding: '16px 0'`, and an
inline shorthand beats a stylesheet's `padding-inline`. So the margin pulled the
row out and the padding that was supposed to cancel it was overwritten by the
shorthand's `0`. Measured: `cardToText = 0`.

**Fix.** `paddingBlock: 16` inline; horizontal padding only in the stylesheet.

**The lesson.** Two specific things, both worth carrying forward:

1. **Inline style > stylesheet — always.** When a component sets a shorthand
   inline, no stylesheet rule on that element can win any of the longhands it
   covers. Split by axis instead of assuming the stylesheet can override.
2. **A measurement that equals a container's own coordinate is a clue, not a
   coincidence.** `cardToText = 0` and the earlier `firstRowY = optionsY` (L29)
   are the same signature: a child sitting exactly on its parent's edge means a
   padding or margin meant to separate them is absent, not merely small.

This is also the third time this session that a defect I had *already written CSS
for* turned out to be a specificity/override problem rather than a wrong value.

---

## L31 — I scoped one rule and silently deleted a page's text

Fixing the over-broad centre selector, I scoped the whole rule to the
conversation. The conversation still looked right. The Plugins page lost **every
character of text** and kept only its switches — because the rule I narrowed had
been doing two jobs:

1. **clearing** the root's opaque background (conversation only)
2. **lifting** content above the absolutely-positioned card (every page)

Narrowing it to fix (1) also disabled (2) for every page.

I caught it because the screenshot was blank where text should be, and because I
was looking at the *other* surface, not just the one I had changed. The measurement
that would have caught it earlier is trivial: `centre.innerText.length` on the
page should be ~1500, and it was ~0.

**The lesson.** Before scoping a selector, list every job it is doing. A rule that
matches broadly is often covering more than one concern, and narrowing it fixes one
while quietly removing the others. Split first, then narrow.

---

## L32 — The failure was invisible in computed style and obvious in a screenshot

Every computed-style probe during that regression looked reasonable: the card was
white, radius 20, the column 1160px, the rules present. Nothing said "the text is
gone". Only the rendered screenshot showed a blank page.

**The lesson.** This is L18/L22 again from a third angle. Computed style answers
"did the browser apply what I wrote"; it cannot answer "is the result usable". For
any change to paint order or stacking, **look at the render**, and pick one cheap
numeric invariant (`innerText.length`) to assert alongside it.

---

## L33 — What items 1 and 2 cost

Two changes, roughly an hour, one self-inflicted regression caught by screenshot
within a minute of making it.

Worth recording what the correct split is, because it is not intuitive:

```
lift  (broad)   > * > *:not([data-slot])        every page in the column
clear (narrow)  [data-slot="main"] [data-slot="main.conversation"] ...
```

The scary rule is the one that looks safer. "Narrow it to the conversation" reads
as conservative and was in fact the destructive change.

**The lesson.** In CSS, a narrower selector is not a safer selector. Match the rule's
scope to the *set of elements that need it*, which is not always the set of
elements you were thinking about when you wrote it.

---

## L34 — "Written but unverified" was a lie I had been telling

For several sessions I carried the right-panel card as "CSS is written, the column
defaults to 0px wide so it has never rendered." That sounded careful. It was false:
there was no right-panel CSS. The `rightbar` part name existed and was stamped, and
I had inferred a feature from a constant.

The difference matters because the two claims have different next actions. "Written
but unrendered" invites a test. "Not written" invites writing it. One of them was
true and I had the other.

**The lesson.** Before reporting the state of any artefact, check the artefact.
`Select-String -Path src\*.js -Pattern 'RIGHTBAR'` would have shown the constant and
nothing else in one second. I was reporting from memory of my own plan, not from the
files.

---

## L35 — Two claims corrected mid-survey, both before they became code

Item 5 produced two wrong statements and no wrong commits:

1. **"Menus are unreachable."** Wrong. They are portaled to `body`, and the root
   attribute is on `html`, so a theme rule reaches them fine. I made this claim
   from the menu's parent being `BODY` and did not test a selector for a full step.
2. **"The nav tile should be 10px, not 14px."** I had the message written and was
   about to commit it. Measuring the host's own nav cell first returned **14px** —
   identical to our token. The change would have introduced the inconsistency it
   claimed to fix.

**The lesson.** A survey that produces a decision is worth one more measurement than
a survey that only produces a description. Both errors were caught by the same
move: test the specific claim in the browser before writing it down.

---

## L36 — The correct output of item 5 was "no change"

Menus were the last unpainted layer, and the honest finding is that they should stay
unpainted: 16px outer, 12px cells, a material layer, shadow, host tokens — already
composed on the same principles as the theme.

There is a pressure at the end of a list to produce a change for every item.
Fabricating one here would have meant a body-level selector with no scoping,
restyling a working surface, to satisfy a checklist.

**The lesson.** "Surveyed, and the correct action is none" is a complete result. It
needs the same evidence as a change — the measurements above — and it belongs in the
decision record precisely because the absence of a commit looks like an omission.

---

## L37 — A green gate says the CSS is well-formed, not that it applies

The build gate has 13 checks and passed on every commit. This audit found **three
declarations in the shipped stylesheet that do nothing**, plus a fourth failure that
is the same blind spot wearing a different coat:

1. `section h3 { letter-spacing: 0 }` — Chromium computes `letter-spacing: 0`,
   `0px`, and `normal` identically. The declaration is valid, matched two `h3`
   elements, and changed nothing.
2. `--dsh-bento-gap` — declared, referenced zero times.
3. `[data-row-key^="session:"]:focus-visible` — the selector is correct and the rule
   *does* paint when forced. But session rows are `role="treeitem"` at `tabIndex=-1`
   with zero focusable descendants, so it can never match in real use.
4. The four reduced-motion blocks in the stylesheet all work — and they miss the one
   component that needed them, because our own switch's transitions are **inline**,
   where no media query can reach. The token resolved to `0ms` and the switch still
   animated for 160ms.

Every one of those is invisible to a gate that checks syntax, brace balance, and
declaration-before-use. **A linter proves the file parses. Only a rendered page proves
the rule landed.** The check that would have caught #1 and #2 is cheap: after
injecting, assert that every declared custom property is referenced, and that no rule
declares a value equal to the element's inherited default. That is a gate I did not
write and should have. (#2 has since been fixed: `--dsh-bento-gap` is gone and
`verify.mjs` has 14 checks.)
---

## L38 — Reading a rule's source is not the same as measuring its effect

Twice this audit I decided something from the stylesheet and was wrong:

1. I wrote that the `h3` rule set tracking, then measured the *computed* value, saw
   `normal`, and concluded the rule was broken. It is not broken — `0` **is**
   `normal` in computed style. The rule is a no-op because its effect is zero, not
   because it failed to parse. Two different findings, and my first explanation was
   the wrong one.
2. I flagged the composer's 28px radius inside a 20px card as a concentric-radius
   defect. It sits 214–331px from the card's edges; concentric maths only binds under
   ~24px of inset. The number looked wrong and was right.

Both were caught by the same move, and it is the move that has now caught something
on every pass: **state the claim as a measurable difference, then measure both sides
of it.** "Removing this rule changes the computed value" and "this radius is
inconsistent with its parent at this inset" are both answerable in ten lines of
browser script. Neither is answerable by looking at the source.

---

## L39 — The audit's most useful output was the list of things that were already right

Targeting conventions rather than defects produced a long list of passes: shadows,
gap, radius tiers, cell closure, anchor dominance, dark layering, collapsed-rail
tokens, reduced motion in the sheet. That list is not filler — it is the set of
decisions a future session would otherwise "correct" into inconsistency, the way I
nearly corrected the settings nav tile from 14px to 10px in L35.

**The lesson.** An audit that only lists gaps teaches the next session what to add.
An audit that also lists the holds teaches it what not to touch. The second list is
the one that prevents regressions, and it is nearly free once the first list is
measured.

---

## L40 — The reference's own numbers contradict its reputation

The bento look is widely described as soft, elevated, shadowed. The reference corpus
says otherwise: **86 of 86 cards have `box-shadow: none`**, and 83 of 86 share one
radius, 68 of 86 one padding. Its "softness" is a 1.143 contrast step and a 1px
border, and its hierarchy is font **weight** (400 / 600 / 700), not surface.

I would have guessed shadows and got the whole elevation model wrong. The aggregate
file was already on disk from the earlier extraction; the work here was running one
grouping query over it rather than trusting the impression the screenshots give.

**The lesson.** A style's reputation is not its implementation. When a reference
corpus is already extracted, aggregate it before designing from memory of how it
looked.

---

## L41 — The audit's proposed fix for P1.1 was wrong, and the code disagreed with itself

The audit's P1.1 said: move the switch's transitions out of inline style and onto the
stylesheet, where `@media (prefers-reduced-motion)` can reach them. It reads as the
obvious fix and it does not work.

**This switch is the control that turns the theme on.** With every feature off —
which is a state a user can be in, and the exact state where they open Settings to
turn one on — the stylesheet is never injected at all. A transition declared only
there would leave the control with no motion, in the one place the user is looking at
it. The suggested fix would have traded a real accessibility bug for a dead control in
the theme-off state, and the four-state table is what caught it: `reduce/theme-off`
is a state the original verification would never have tested.

What shipped instead resolves the duration in three steps: the token when the theme is
on (which is what the media query reaches), a `matchMedia` read at render as the
fallback (which is what makes the theme-off case correct), then the design value.

**The lesson.** "Move it to the stylesheet" is a fix-shaped sentence that can be wrong.
The question to ask first is *what state is this component in when the thing I want to
depend on is absent* — and for a settings control, the answer is often "the state it
exists to create".

---

## L42 — A gate that cannot fail is theatre; three plants made this one real

The new check (`no transition hardcodes a duration`) went green immediately. A green
run on a clean tree proves nothing, so it was proved red three times:

1. the original shipped literal, `transition: 'background-color 160ms …'`
2. a `0.16s` variant, to confirm the regex is not matching the string `160ms`
3. a literal inside a CSS template literal in a *different* fragment — the case a
   check scoped to `60-settings.js` alone would have missed entirely

All three failed with the file and line. Restoring then exposed a second thing worth
knowing: `git checkout -- src/` reverted the fix along with the plants, because the fix
was not yet committed. The gate caught it (`60-settings.js:61: translate 160ms`), which
is the system working — but the sequence to follow is **commit the fix, then plant**,
not plant against uncommitted work.

**The lesson.** Prove the failure mode you can reach, mentally, *and* the one you
cannot: use a second plant in a different file or a different syntax, because the
narrowest check passes on the example you had in mind while missing its neighbour.

---

## L43 — "No focus indicator" was a false finding, and it was false for one reason

The audit's P1.2 said keyboard users see nothing on the Plugins page. It was written
from this measurement:

```js
getComputedStyle(control).outline   // "rgb(15, 17, 21) none 3px"
```

`none` — so, no indicator. **Wrong.** The host draws a 2px brand ring on the control's
`::after`, absolutely positioned at `inset: 0`. Because the row is `position:
relative`, that pseudo resolves against the **row**, so the ring outlines the whole
card. A full ring around the row, in both themes, confirmed at 3x zoom.

The mistake was not a missed detail, it was a **category error**: "outline" is one of
several ways to draw a focus indicator, and I tested for the one I happened to think
of. Pseudo-elements, box-shadow rings, background changes, and transformed siblings all
exist. The general test is not "does it have an outline" but "does anything change when
focus moves" — a before/after diff of the rendered pixels, which is what settled it.

**The lesson.** Test for the property you care about ("is focus visible"), not for the
implementation you expect. When a finding says a thing is *absent*, that claim needs
the same evidence as one that says it is present — and absence is harder, because you
have to rule out every mechanism rather than find one.

---

## L44 — The theme broke the host's focus ring, and only pixels showed it

Once the ring was found, the interesting question was not "is it there" but "does it
still line up". The host draws it at its own card radius, 20px. This theme had set the
row to 14px. So the ring arced wider than the surface it outlined, and both curves
separated at all four corners.

Every computed-style check passed. `rowRadius=14px`, `ringRadius=20px`, both correct
for their own element — the *relationship* was wrong, and no property reports a
relationship. It took a 3x crop of one corner and the two images side by side.

**The lesson.** A theme that restyles a container inherits responsibility for every
decoration the host attaches to that container, including decorations drawn on
pseudo-elements the theme never mentions. Changing a radius is not a local change when
something else is drawn at the old radius — grep for what *uses* the value, not just
what declares it.

---

## L45 — The audit's proposed fix would have introduced a second bug

P1.2's suggested fix was `:focus-within`. Taking it would have made a row fill after a
**mouse click** on its switch and stay filled after the pointer left, because
`:focus-within` does not distinguish keyboard focus from a click. A fill that persists
once focus is no longer visible is not a focus indicator; it is a stuck highlight.

`:has(:focus-visible)` gives the keyboard fill without the click stickiness. Verified
by clicking the switch, moving the pointer away, and asserting the row computed
transparent — a test written specifically because the obvious selector fails it.

**The lesson.** When an audit hands you a fix, the audit's reasoning is a hypothesis
too. Two of this theme's fixes (P1.1 and P1.2) came with a suggested approach that was
wrong for a reason specific to this codebase — a control that must work when the
stylesheet is absent, and a selector that cannot tell keyboard from mouse. The
suggestion is the finding's weakest part; treat it that way.

---

## L46 — Six backticks, and the gate that finally named them

Adding the forced-colors block, I put a backtick in a CSS comment **four times in one
sitting**. Each time the build failed, each time the cause was the same, and each time
the only reason it was caught was that `node --check` ran before install.

The existing gate for this hazard scanned comments for backtick characters — and it
worked, but it reported a line number without saying why the line mattered, and it only
looked at comments. The failure mode is broader: a stray backtick closes the template
literal, and what remains is usually **valid JavaScript**, so the bundle parses, the
brace-balance heuristic passes, and the stylesheet is silently truncated.

The fix was a check that parses each fragment as source:

```js
new Function('require', text)   // parse, do not execute
```

It names the fragment and the parser's own message. Proved red on the exact bug in two
different files before being trusted. Two fragments (`00-prelude`, `99-footer`) are
delimiters and cannot parse alone by construction — excluded explicitly rather than
loosened for everything.

**The lesson.** When the same mistake recurs, the answer is not more care. I was being
careful; that is what produced six occurrences. The answer is a check that fails faster
than a human reads, and then to keep the check honest by planting the bug in it.

---

## L47 — Three P2 "findings" were wrong, and two were wrong the same way

Working the P2 list:

1. **P2.2** said the rows were "over-rounded against concentric maths". The real defect
   was different: the host draws all four sidebar rows at **12px**, and this theme
   overrode two of them to 14px — a value not on the host's radius scale at all. The
   audit had the right observation (14px is too round) and the wrong explanation, which
   would have led to 6–8px and made the column less consistent, not more.

2. **P2.9** said our canvas made the host's AA-failing badge worse, 3.75 → 3.25. It
   costs **0.00**; the badge sits on its own translucent pill and our canvas never
   reaches the text.

3. **D38** (from an earlier session) claimed the host's nav cell was 14px. It is 12px,
   and the 14px was read off our own stylesheet with the theme active.

**Three measurements of "what the host does" were taken while the theme was on the
page.** That is the single error behind two of the three. The cure is mechanical:
disable the plugin first (`p2-host-radii.cjs`), then measure.

**The lesson.** A comparison against the host is only a comparison if the host is the
only thing running. And a finding's *explanation* needs the same evidence as its
*observation* — the observation that 14px looked wrong was correct; the arithmetic I
attached to it was not, and it pointed at the wrong fix.

---

## L48 — "No action" is a result only when it carries a number

Six of ten P2 items ended with no code change. Writing them up was most of the work,
because "we decided not to" is indistinguishable from "we did not look" unless each one
states what was measured and why the measurement removes the option.

Two of those six are worth the space they take:

- **P2.5** (squircle corners) was tried live at three radii and **deferred because I
  could not show it matters** — the 3× crops were near-identical and my pixel-diff
  tooling failed. Shipping a visual change on "it is supposed to look better" is the
  thing this project's rules exist to prevent. It stays a candidate.
- **P2.1** (the inverted spacing ratio) cannot be fixed without padding the frame,
  which carries an inline `grid-template-columns`; padding it compresses every column
  and moves every drag handle. Measured, recorded, and left.

**The lesson.** A no-action item earns its place by naming the measurement that rules
out the action. Without that it is a shrug with a heading.
---

## L49 — My test harness failed the code, and the code was right

The final verification run on the committed P2 build reported three failures:

```
FAIL [light] P2.2 card still 20px = false
FAIL [dark]  P2.2 card still 20px = false
FAIL [forced] P2.4 card edge still drawn = false
```

All three were bugs in the test, not the theme. Every helper was written as

```js
const cs = (e) => getComputedStyle(e);
```

and called as `cs(el, '::after')`. JavaScript ignores the extra argument, so every
pseudo-element read silently returned the ELEMENT's computed style instead. The card is
painted on `::after` and the column itself has radius 0 and no border, so the harness
reported "card is 0px" and "no edge" about a build where both were correct.

Measured directly afterwards: cards 20px, forced-colors card edge
`1px solid rgb(0,0,0)`.

**Why this is the same class of error as everything else in this file.** A wrong
measurement that is *silently* wrong is worse than a crash, because it is
indistinguishable from a real finding. The harness said "the code is broken" and the
only thing that contradicted it was reading the values by hand.

**The lesson.** A test helper that takes a pseudo-element argument is only a test helper
if it passes it through. The general form: *silently ignored arguments produce silently
wrong data*, and the fix is to make the helper's result impossible to misread — here, by
checking the numbers by eye once before trusting the boolean derived from them.
---

## L50 — The reference contradicted the brief, and that was the finding

The request was "icon philosophy for bento design", which presupposes that bento is an
icon-led style. Before writing anything I counted `<svg>` elements in the 14-page
reference corpus:

- **7 pages: zero icons**
- 6 pages: one or two (a logo, a chevron)
- 1 page: thirteen — and it is a different product embedded with its own system

**1.5 icons per page across 470 KB pages.** The pages that actually carry bento cards
are the icon-free ones. The bento look is carried by density, weight and alignment.

So the honest answer to "what is the icon philosophy for bento" is largely *"there is
none, and that is the philosophy"* — icons are punctuation in a composition whose content
is numbers. Writing a design-system essay about grid sizes and stroke weights would have
answered a question the reference says does not arise.

**The lesson.** When a request presupposes a premise, measure the premise before
designing to it. The measurement is cheap — one regex over files already on disk — and it
either confirms the brief or replaces it with a better question.

---

## L51 — Three of my own numbers were wrong, and the doc shipped neither time

Writing the icon philosophy, I asserted counts from a first scan and checked them only
after drafting:

| Claimed | Actual |
|---|---|
| 27 icons at 16×16, 19 at 14×14 | **24 and 14** |
| 8 / 4 / 1 pages by icon count (sums to 13) | **7 / 6 / 1** |
| "39 at 1px and 11 at 1.3px" | two different populations mixed; both screens are **30 and 12** |

All three are the same mistake: a histogram from one screen, reported as if it covered
every screen, or a bucket count that does not sum to the population. A count that does
not add up is the cheapest possible self-check and I did not run it until a table looked
wrong.

**The lesson.** Arithmetic on counts has a free correctness check — do the parts sum to
the whole? Pages: 7+6+1 must equal 14. It did not, and that is what caught it. Run that
check as the numbers are written, not after.

---

## L52 — I explained a measurement I had not measured

The measured fact was: the Settings dialog uses 1.3px for 9 of its 17 icons, while the
centre column uses it once. The sentence I first wrote was "because it renders at the
same 16px box but reads at a shorter viewing distance inside a modal."

That is a plausible cause and it is not in the data. Nothing I measured distinguishes
viewing distance from any other reason the two regions might differ.

It is now written as: what is measured is the split; the reason is an inference and is
labelled one. The rule it supports is narrowed to what the split can actually justify —
1px default, 1.3px permitted only inside that dialog — which is safe whether or not the
inference is right.

**The lesson.** A causal "because" promoted from a correlation is the most persuasive
kind of wrong sentence, because it makes the finding feel explained. The test: could I
design an experiment that would show this cause and not another? If not, it is an
inference, and the document says so.
---

## L53 — "It does not scroll" was a collapsed box, three layers away

Reported: the right panel will not scroll. I had a ready-made suspect — an
`overflow: hidden` I had written on `_tabHost` during the right-panel card work — and I
went looking for it.

It was not that. Measured, the panel was **288px tall inside a 900px column**, and
nothing in the pane overflowed at all. There was nothing to scroll because there was no
content box left to scroll. Disabling the theme gave 900px.

The cause was one declaration I had added two features earlier: `position: relative` on
an element the host positions `position: absolute` with all four insets set. That panel's
height *was* its anchoring. Overriding `position` detached it and it shrank to content.

**The lesson.** A reported symptom names where the user noticed the problem, not where it
started. "Cannot scroll" and "box is a third of its height" are the same bug seen from
two distances, and the second is the one that names the cause. Measure the box before
believing the symptom's vocabulary — and when the obvious suspect does not reproduce,
that is information, not a dead end.

---

## L54 — Restyling a box and repositioning a box look like the same edit

The bug in L53 was not carelessness about CSS. `position: relative` is exactly what you
write to give a pseudo-element a containing block, which is what the card technique
needs — it is correct on the column and catastrophic on the host's absolutely-positioned
panel. Both are "one line in a style block".

The distinction that matters: **a property the host derives size from is a contract, not
a default.** Overriding it is a layout change wearing a style change's clothes, and
nothing fails at the moment you do it. It failed two features later, at the top of a very
long chain of wrappers that are all `overflow: hidden`.

Now gated (check 18). The gate's own first version was wrong twice — it never reset its
selector tracking so it inherited the first rule's selector across the file, and it
classified our own column wrappers as host-owned because they reach into their children
with `> * > *`. Ten false positives on a clean tree before it was right.

**The lesson.** A gate built from a real bug still has to be proved against that bug and
against a clean tree. I have now shipped two gates whose first version failed one of
those two directions, and both would have been caught by running them on the tree they
were written for before trusting the green.
---

## L55 — Three measurements said "fine" and the bug was real

The report was "the bento curves make the border text touch the border". I built three
tests before one found it:

1. **Text-to-edge distance.** Measured every text box against the card's edge. Minimum
   gap 12px. Verdict: nothing touching. Wrong test — a 12px inset is clear on a straight
   edge and fails at a 20px corner arc.
2. **Rounded-rect containment, text only.** Tested green too. Wrong scope — the clipped
   elements were **icon buttons**, not text.
3. **Rounded-rect containment, text AND controls, corner by corner.** Found it
   immediately: three header buttons failing at `y=10` against a card top of `12`.

The failing axis was vertical, while the report said "border text" — horizontal-sounding.
Had I trusted either green test I would have told the user their eyes were wrong.

**The lesson.** "Nothing is overlapping" is a claim about geometry, and geometry near a
corner is not a bounding box. Two specific traps worth naming: a card's rounded corner
excludes more area than its edge does, and a report that names a *horizontal* symptom can
be describing a *vertical* overhang. Test the actual shape, and test every element class
that can be clipped, not just the one the words named.

---

## L56 — The fix that works and the fix that also works are not equally safe

Three candidate fixes all produced zero violations and all kept the panel at 900px:
padding the tab host, padding the header, and margin on the header.

The safe one is **padding the tab host**: it insets the whole pane's contents, so every
future child inherits the correction. The others fix the header specifically and would
have to be reasoned about again the moment something else is added above the fold.

And the option that looked most obvious — margin on the panel — was measured to drop its
height from 900px to 876px, i.e. it reintroduced the bug fixed one commit earlier (D50).
I checked it anyway rather than assuming, and the check is what ruled it out.

**The lesson.** When several fixes pass the same test, pick the one whose correctness
does not depend on today's DOM. And re-run the *previous* bug's test against any change
to the same element — the two bugs here were one commit apart and shared a root cause
element.
---

## L57 — `border: 0` lost, and the computed style was the only thing that said so

Removing the divider looked like a one-line change. I added `border: 0` to the tab host
rule, rebuilt, and the verification reported the border still there — `1px solid
rgba(0, 0, 0, 0.16)` — in both themes.

The cause: the host declares that border with **five compound selectors**:

```
._tabCell[data-dockkit-host="dock"][data-dockkit-column="0"] > ._tabHost_x
```

against our three. Specificity decides before source order, so our rule lost regardless
of where it sat. Repeating the part attribute in our selector (`[part="rightbar"][part]`)
raised it above without `!important`.

**The lesson.** "I set it to zero" is not "it is zero". Reading the computed value after
the change is the only evidence, and it is one line. This is the third time in this
project a declaration has been present, correct, and inert — the other two were a
`letter-spacing: 0` that equalled the default and a `-gap` token nobody referenced.

---

## L58 — Three surfaces the user expected to be themed, and none of them were

Asked whether the permission popups, model selector and attachment pane adapt to the
bento UI. Measured all three: **the theme does not touch any of them** — queried our own
stylesheet against each popup and got no matches at all.

They are not neglected; they are overlays, deliberately left on the host's material
(D38, re-confirmed as D52). And the numbers happen to agree with the theme anyway:
12px cells is our inner radius token, 34px rows is our session-row height. The only
outlier is the 16px outer radius, which is right for something floating above the grid.

**The lesson.** "Does X adapt?" has two very different answers — "we styled it" and "it
already matches" — and only measurement separates them. A report that says "no" without
saying which kind of no is useless: it reads as a gap when it may be a finished decision.
---

## L59 — A feature that looked shipped because I only ever tested one of its tabs

The work that themed Settings shipped, verified, and was reported as done. It themed
**one tab out of six.** The other five were never measured — I built the rules from the
first tab I opened, saw them work there, and stopped.

The user found it, not me: a screenshot of Models, with "this is not bento ui".

The cause was an anchor: `[data-slot="settings.general.item"]`, which only General
writes. Three other tabs are separate bundles with their own card renderers. Nothing in
the code was *wrong* — it did exactly what it said. The claim attached to it was wrong.

**The lesson.** "I verified the feature" means nothing until I can name the surface
inventory. For anything with tabs, sections, states or pages, the unit of verification is
every one of them, and the way to know I have them all is to enumerate them from the DOM
first and then check each by name. A verification against the one surface that happened
to be open is a spot check wearing a completion claim's clothes.

---

## L60 — "This is not bento" was true, and the fix was not "make it more bento"

The obvious reading of the report was: remove the boxes, flatten everything to rows. That
would have been wrong. Three of the tabs are 2-up grids holding 29 plugins and 4 rich
presets; a single column of 29 rows is not more bento, it is just longer.

The answer was to flatten the *paint* and keep the *layout*: border and fill go, the grid
stays. That is the same distinction as D50 and D51 — paint is ours, layout is the host's —
applied to a case where the correct answer was "less, but not everything".

**The lesson.** A report of "this does not look like X" invites a maximal response in the
direction of X. The useful question is which property is wrong, not which direction is
right. And the two small traps here — a selected state that lived in the border, and
padding that outlived its box — were both invisible in a screenshot and only appeared
when I measured what the flattening would remove.
---

## L61 — The CSS was wrong and the test was wrong, and only one of them was the bug

Chasing the settings radius, two defects were live at once:

1. The card was 12px inside a 28px panel, so the pair was not concentric. A real product
   bug, visible at 6× as a corner that pinches.
2. My concentric test asserted `dx == edgeGap`. For a uniformly-gapped nested pair the
   arc centres **coincide**, so the correct assertion is `dx == dy == 0`. The test
   reported `CONCENTRIC=false` on CSS that was already correct after the fix.

I nearly re-edited correct CSS to satisfy a wrong test. What caught it: the fix produced
`DRIFT=0` and `dx=0 dy=0` while the boolean still said false — the two numbers disagreed
with the verdict, and the numbers were the trustworthy half.

**The lesson.** When a check and a measurement disagree, suspect the check. A test is
part of the change and needs the same scrutiny as the code, but it *feels* authoritative
because it prints PASS/FAIL — which is exactly why a wrong one is expensive. The tell is
a boolean that contradicts the values printed beside it.

---

## L62 — "Apply the same rule everywhere" needed a boundary before it could be applied

The request was to match inner curvature to outer and apply that everywhere. Stated as a
rule it sounds general; applied literally it breaks things. Three false readings appeared
immediately:

- A 28px close button 2px inside the card would need a 14px radius — a circle, not a
  match.
- A switch thumb (r=50) and a status pill (r=999) are "rounder than their parent" by
  design.
- The three Appearance tiles are 183×84 surfaces with their own 20px radius; matching
  them to a row's 16px would make large tiles look nearly square.

The boundary that worked: the law binds **containers** — surfaces that fill their parent,
so the two curves share a corner. The discriminator is coverage, set at 50% of area. That
is a real distinction, not a fudge: it separates "the card fills the panel" from "a button
sits on the card".

**The lesson.** "Everywhere" is only actionable once the rule has a domain. Answering it
by applying the rule to everything would have produced a dozen visibly wrong corrections
in a change that tested green — because the false cases were small enough to pass
inspection and numerous enough to hide among the real ones.
---

## L63 — "More accent" made the text less readable, and only measuring showed it

The selected row needed an accent-blue label on an accent tint. The obvious derivation is
to mix the accent mostly with the theme's text colour, so I used 78% accent. Contrast came
out at **4.14:1**, below AA.

The intuition says more accent = more saturated = more contrast. It is exactly backwards,
because `label-primary` is **near-black in light and near-white in dark**. Mixing the
accent toward it moves the colour toward *whichever end the theme's text sits at*, so at
78% the blue had been washed most of the way to the theme's foreground and the remaining
hue could not carry the contrast. Reducing to 65% raised it to 4.60:1.

**The lesson.** A colour-mix percentage is not "how much of the colour you get" — it is a
position on a line between two colours, and which end helps depends on the backdrop. Two
of the three ratios I tried failed, and no amount of reading the CSS would have revealed
it; only computing contrast against the actual fill did.

---

## L64 — "Are we using this token reference?" has three different answers

The question was whether the Bento UI uses the Blue & Orange reference. It resolves into
three separable facts, and answering only one would have been misleading:

1. **The file's values** — no, and correctly so. It is a different product's design
   system (an RSI KPI dashboard) with its own scale: `#F6F7F9` page, `#2F6BEB` accent,
   24px cards, Inter. We are a theme inside someone else's host and cannot impose that.
2. **Its token *model*** — partly, and it already matched. That model is "every colour is
   a named CSS variable, the switch swaps the set, status colours stay fixed". Our tokens
   carry the same shape in the host's own names (`--dsw-alias-*`); swappability comes free
   because the host owns the alias layer. We did not need to adopt anything for this.
3. **Its selection *treatment*** — no, and that was a real gap. The reference's tint +
   accent-ink + no-border pattern is what this turn adopted (D55). It was the one part of
   the reference that was both correct for our context and missing from ours.

**The lesson.** "Are we using this reference?" is not yes/no. Separate what a reference
specifies — values, model, and interaction patterns — because one can be wrong for you
while another is exactly the thing you are missing.
---

## L65 — The spec's shadow colour was unusable as written, and the reason is dark mode

The reference gives a shadow as `rgba(15, 23, 42, 0.04)` and `rgba(15, 23, 42, 0.06)`.
Written literally into the stylesheet that is one line of CSS and it looks correct — in
light mode. In dark mode a near-black shadow falls on a `#2c2c2e` card and does nothing at
all: the card silently loses its lift and there is no error to notice.

So the shadow is derived from `--dsw-alias-label-primary`, which is `#0f1115` in light and
`#f9fafb` in dark — the theme's own near-black/near-white. Reading it back: `(15, 17, 21)`
at the spec's alphas in light, correctly light in dark.

**The lesson.** A colour in a design spec is usually quoted from one theme. Before copying
it, ask which surface it was measured against — a shadow, an overlay and a focus ring all
invert meaning when the surface under them inverts, and all three are the kind of detail
that gets pasted straight from a mockup.

---

## L66 — "Same offsets, same blurs, different colour" is not a compromise

The shadow I shipped matches the reference in offset, blur radius and alpha, and differs
only in hue, because it takes its colour from the theme instead of the mockup. It would be
easy to describe that as an approximation. It is not: the hue *is* the same colour in the
theme whose values the spec was written for, and it is the only version that is still a
shadow in the other theme.

**The lesson.** When a spec value is theme-dependent, matching every dimension except the
theme-dependent one is not 95% fidelity — it is 100% fidelity to the spec's intent and zero
to a copy of its raw output. Worth saying explicitly rather than letting it read as a
shortfall, because "we matched all of it but the colour" sounds like an excuse when it is
actually the only correct reading.
---

## L67 — Two of my own rules fought each other, and neither looked wrong

The stats strip's gap would not change. First cause: my single attribute selector lost to
the host's class selector, so the rule was in the stylesheet and inert — the computed gap
stayed at our own token's fallback. Fixed by doubling the attribute.

That was not the whole story. The gap then resolved to 8px, still not the 12 I asked for.
The reason was a *second rule of my own*: a broad `[class*="root"]` under the composer bar
that also matched the stats element and set `gap: var(--dsh-bento-gap)` = 8.

**The lesson.** "My selector does not match" and "my selector matches but something else
wins" are different bugs with different fixes, and the second one is invisible if I only
check whether my rule is present. Reading every rule that sets the property — with its
origin — is what separated them. And the tie-breaker was a selector I wrote on a guess
rather than a measurement; guesses about structure are exactly what produce this.

---

## L68 — A rectangle cannot honour a rounded corner, no matter how the corner is painted

The conversation card had a square bottom corner whenever content filled it. The card was
not at fault: it is painted perfectly, as an inset rounded rect on a pseudo-element. What
painted over it was the host's scroll container — a plain rectangle reaching the card's
exact edges, with no idea that a curve existed beneath it.

Two conditions had to be right, and the first attempt satisfied neither: the element must
**scroll** (a radius on `overflow: visible` clips nothing), and it must carry the **card's**
radius rather than the inner tier, because it reaches the card's edge.

**The lesson.** When a shape looks wrong, find out what PAINTS it before editing the thing
that defines it. A card and the content inside it are painted by different elements, and
only one of them knows about the curve.
## L69 — One width probe produced two confident false claims about fonts

D58 stated that Inter was "available in the browser". It is not installed. The probe was:

```
ctx.font = '16px Inter';  const w = ctx.measureText(sample).width;
// w !== width of '16px sans-serif'  ->  "Inter is present"
```

That comparison cannot answer the question. `a !== b` establishes only that they differ. A
CSS font stack that names a missing family falls back to the **browser default**, and the
browser default is not `sans-serif`, so a missing font *always* differs from `sans-serif`.
The probe was guaranteed to produce "present" for any name typed into it, including one
that does not exist.

**The version that works needs two negative controls.** Measure the candidate and *two*
deliberately-nonexistent families. A family that is genuinely installed differs from both;
a family that is missing matches both.

```
Inter              437.88   matches both missing bases  -> not installed
JetBrains Mono     437.88   matches both               -> not installed
"Segoe UI"         461.26   differs from both          -> installed
Consolas           510.22   differs from both          -> installed
```

The same session, with the same instrument, also gave the right answer for JetBrains Mono —
which is what makes this worth recording: a broken instrument does not fail every reading.
It returns plausible numbers, one of which happens to be right, and the mixture is harder to
distrust than a clean failure.

**The lesson.** A presence probe needs a KNOWN-ABSENT control, for the same reason a gate
needs a planted violation. "Different from the default" is not evidence of presence; it is
evidence of difference. L41 records the gate version of this; this is the measurement version.

## L70 — Reading a custom property's value cannot tell you how it was built

Deciding how much CSS the font swap needed, the tokens looked independent: 183 of them,
each reading back with a complete family stack spelled out.

```
--dsw-font-markdown-h1:  700 calc(21px + …) / calc(30px + …) -apple-system, BlinkMacSystemFont, …
--dsw-font-s-14:         14px/22px -apple-system, BlinkMacSystemFont, …
```

Thirty-one of them even had a `-font-family` sibling, which looked like proof that each owned
its own literal. The conclusion "override 31 tokens" was one step from being written.

It is wrong, and the read-back is why. Custom properties substitute **when computed**, so
`14px/22px var(--dsw-font-family)` reads back exactly like a literal. The resolved text is
identical; only the declaration differs, and `getComputedStyle` shows you the former.

**The test that answers it** is to change one candidate and count followers: redefine
`--dsw-font-family` alone, force a reflow, re-read all 183 tokens. 62 followed, 1 stayed
literal. It took one experiment and replaced 31 speculative rules.

**The lesson.** For a custom property, ask what it *derives* from, not what it *reads as*.
Vary the suspected input and see what moves — the same reasoning as an ablation, and it
costs one probe instead of a hand-maintained list that silently rots when the host changes.

## L71 — Three failing assertions, and all three were the test

The first verification run for the two new features reported three failures. None was a
defect in the CSS; all three were defects in the assertions, and each was a different species:

1. **A slice that cut the evidence off.** Tokens were read as `.slice(-40)` to keep the
   payload small — which removed the *front* of every font stack, and the family under test
   is always at the front. `"Bento Inter", -apple-system, …` became `…Helvetica, Arial`, so
   "uses Bento Inter" was false for a value that started with it.
2. **An assertion that was simply wrong about the design.** "Only ONE text family remains"
   asserted the *goal* was uniformity. The goal was the *pairing* — Inter for text, Mono for
   code — so two families is the correct answer and one would mean Mono never shipped.
3. **A shorthand that overrode the input to the measurement.** The mono token was applied
   via `font: var(--dsw-font-markdown-code)`, a shorthand that carries its own `12px`, while
   the comparison probes were fixed at `16px`. The reported mismatch (129.61 vs 172.81) is
   exactly 12/16 of it. The measurement was comparing two sizes and blaming the font.

**The lesson.** When a new test fails, check the test before the code — and check it by
predicting the number. The third failure was solvable on sight (`129.61 × 16/12 = 172.81`)
because a *ratio* appeared where a match was expected. A failure that is a clean ratio is
almost always a unit or a size, not behaviour.

## L72 — Two false test failures, and both were the harness assuming state it never set

The full regression went from all-pass to `p2-regression: FAIL (4)` — canvas tone, centre
card, sidebar card and settings card all "changed". Nothing in the product had changed. The
suite was measuring the wrong theme.

`p2-regression` has a `light` and a `dark` pass. The dark pass did this:

```js
if (mode === 'dark') document.body.setAttribute('data-ds-dark-theme', '');
```

It only ever ADDS the dark attribute. The light pass never removes it. And appearance is
persisted **in the profile, server-side**, not in `localStorage`, so a new browser context
inherits whatever mode the previous test left behind. Run first: PASS. Run after any test
that ends dark: FAIL (4), every failure a light-mode colour compared against a dark one.

`font-chips-verify` failed the same way and for the same reason, with a different symptom:
it pinned Send's accent to the light literal `rgb(65, 118, 230)`, and dark uses
`rgb(122, 170, 255)`.

**Two fixes, and they are different kinds.** For `p2-regression`, force the mode instead of
inferring it — then *verify it took* by reading the body tone, and push a harness error if it
did not. For `font-chips-verify`, assert the property instead of the number: Send must keep
a *saturated accent fill*, which is true of both theme accents and false of greyscale.

**The lesson.** A test that reads persistent global state must SET that state and then
confirm it, or its result depends on run order. The failure mode is especially bad here
because it is order-dependent: the suite passes in isolation, so the first thing you check is
"what did I just change", which is the wrong suspect. Two of my own probes had the same hole
— a "light" screenshot pass that was actually dark, which I only caught by rendering the
pixels instead of trusting the label.

## L73 — A gate with two bugs, found by the gate firing on a legitimate rule

Gate 18 ("no position on a host-owned element") refused the new Settings-nav card. The
refusal was correct — the `position: relative` I had added was unnecessary, and removing it
was the right fix. But investigating produced two defects in the gate itself:

1. **A dead exclusion.** The regex carried `(?!nav)` to permit `> nav`, and it could never
   fire: `\s*` matches zero characters, so on `" > nav"` the lookahead is evaluated before the
   space and reads `" nav"`. Proving it took one line — `/ >\s*(?!nav)/` matches `">"` with the
   lookahead seeing `" "`. It had never excluded anything since it was written.
2. **A tracker that never closed.** The rule scanner reset `current` only on a *bare* `}`,
   but every fragment ends as `});` from `FEATURES.push(...)`. So the last selector stayed
   live for the rest of the file, and a `position:` declaration appended at the end was
   attributed to `FEATURES.push({` — which the host-owned pattern does not match. A planted
   violation passed. The proof that found this was planting one and watching it survive; a
   green run would never have shown it.

**The lesson.** "The gate went red on my change" and "the gate is correct" are independent
claims. Here the gate was right about the change AND wrong about itself, and only pulling the
thread found both. Every gate needs its own planted-violation proof, and needs it again after
it is edited — an exemption added for a good reason can quietly widen to cover a bad one.

## L74 — Two measurement bugs of my own, both of the same species

While verifying the composer's surface, two assertions failed and both were the *measuring
code*, not the thing measured:

1. **Counting shadow layers by splitting on `"),"`.** The theme's ink resolves to
   `color(srgb ...)`, whose commas are inside parentheses, so the split found one layer where
   there were three and reported "no soft shadow" for a shadow that was visibly painted.
   Layers are comma-separated at top-level only; splitting needs paren depth, not string
   matches.
2. **Comparing a colour against the pseudo-element of a dialog that was open.** The card tone
   was read from the centre column's `::after` while the Settings dialog covered the screen;
   it returned `rgba(0, 0, 0, 0)` and the comparison failed against a real colour. The token
   was the correct source all along.

**The lesson.** Both bugs produced a *plausible* failure — a missing shadow, a tone mismatch —
so both looked like product defects. What separated them from real defects was checking the
number prediction: the shadow string visibly contained two `0px 8px 24px` terms, and the
composer's computed fill was byte-identical to the card's. When the evidence contradicts the
assertion, suspect the assertion.

## L75 — "There is a shadow" and "you can see the shadow" are different facts

The To-dos bar looked like it had no surface at all. Reading its computed style showed it
had four: a 58%-alpha fill, a blur, a three-layer elevation shadow, and a radius.

All four were real and all four were inert. `--dsw-menu-backdrop-filter` and
`--dsw-elevation-panel` both resolve to `none` on this host, so two of the four were not
merely weak, they were absent. The fill is `rgba(248,249,250,0.58)` — 58% near-white — and it
sits on a white card, so it composited to white. The element had *every* property of a
floating surface and no visible edge whatsoever.

**The lesson.** `getComputedStyle` answers "what value was applied", and for a translucent
fill that is not the same question as "what colour is on screen". Two checks are needed:
resolve the colour against what is behind it, and read the pixels. This project already knew
that (architecture §8, L12) and I still started from the computed style and had to go back to
pixels to prove the fix.

**A second trap in the same probe.** I simulated the host's panel markup before styling it,
because this profile's sessions fail to load and no real todos exist. That simulation is
honest *only because it uses the host's own CSS-module classes and its own stylesheet already
loaded in the document* — the appearance measured was the host's, not an imitation. A
hand-written approximation of the classes would have measured my own guess back at me. When a
simulation stands in for missing data, it has to borrow the real thing's styling, not
reproduce it.

## L76 — Both remaining failures were the assertions again, and one was a unit mistake

After the fix, two checks failed in both themes. Neither was the CSS:

1. **"tone differs from the card"** — I had written the assertion for the *recessed*
   treatment, the one that was rejected two turns ago. The chosen fix keeps the card tone and
   separates with a hairline plus shadow, so "differs from the card" is false by design. The
   assertion contradicted the decision it was verifying.
2. **"header height unchanged (36)"** — 36 is the *panel root's* collapsed height; the
   header row is 24. I compared a container measurement against a child expectation and got
   a mismatch that looked exactly like a layout regression.

**The lesson.** A failing assertion is a claim about intent, and intent can be wrong in a way
the code is not. Both of these would have been "fixed" by changing working CSS. The tell was
cheap: the numbers were 24 and 36 — a child and its parent — and the tone assertion
contradicted a decision recorded one entry earlier. Read the assertion against the decision
before touching the implementation.

## L77 — A 100 ms transition made a working feature look completely broken

The Send button's fill is painted from `--dsw-alias-button-info-fill`, and the button carries
`transition: background-color .1s`. Three times in a row I concluded it ignored every accent
token:

1. overriding the token on `body` — read back old colour
2. overriding it on the button itself — read back old colour
3. setting `background: … !important` directly — read back old colour

`getComputedStyle` returns the **currently animating** value. Injected a rule, read immediately,
got the value from before the transition started. Adding one 400 ms wait turned all three into
the expected result, and the real answer — two tokens, not one — appeared immediately.

**The lesson.** A `getComputedStyle` reading taken in the same tick as a style change measures
the transition, not the destination. Any host control with a `transition` on the property under
test needs the wait, and a result that says "the style had no effect at all" should raise
suspicion rather than confidence: CSS rules very rarely lose outright, and "nothing happened" is
more often a measurement problem than a cascade problem. This is the same family as L74 (reading
a value through the wrong lens) and L75 (a shadow that cannot be seen).

## L78 — The invented numbers failed and the derivation succeeded, for the reason I had backwards

Building a per-accent ink table, the two entries I flagged as "tricky" were amber and rose,
because a saturated warm accent needs a dark ink for contrast. Computed, they measured **1.20:1
and 1.24:1** — unreadable — while the theme's existing derivation (accent mixed 65% toward the
label colour) gave **7.31:1 and 5.92:1**.

The instinct was inverted. On a *light* tint the ink darkens; on a *dark* tint the tint is
already dark, so the ink has to **lighten**. I had carried the light-theme pattern across by
analogy instead of computing it, and the two accents with the strongest hue difference were
exactly where the analogy broke.

**The lesson.** When a design system already derives a value, test whether the derivation
generalises before writing a table of values. Here one computation replaced sixteen hand-picked
colours, and the sixteen would have needed re-checking for every new accent. The tell that it was
worth checking first: the numbers I was writing had no provenance, and the derivation's numbers
could be printed in one script.

## L79 — `corner-shape` inherits, and `round` is not a keyword this build honours

A 999px-radius swatch drew a rounded square. Three wrong guesses before a grid settled it:

- assumed the radius was wrong — it was 999px, correct
- assumed a `corner-shape: round` would fix it — it computed to `superellipse(1)` and was
  *correct*, but was being overridden by an inherited `superellipse(1.5)`
- assumed the property could be set from the renderer — React dropped it silently, so the span
  kept inheriting 1.5 from its button

What worked was rendering a grid of exponents side by side and reading which one is a circle:
`superellipse(1)`. `0`/`bevel` at a 999px radius is a **diamond**, and `2`–`4` get progressively
squarer, so the property is not a preference but a curve definition with a specific neutral point.

**The lesson.** For a property with no well-known visual meaning, render the candidate values
side by side and pick from pixels. And when a value "does not apply", check whether it applied
and was then overridden by inheritance — `getComputedStyle` on the element showed
`superellipse(1)` in a probe and `1.5` in the real tree, which is only visible when the parent
chain is inspected too.

## L80 — The bug did not exist until the page had content

Three probes found no dark band because an empty conversation never renders it. The host's scrim
is gated on `data-phase=active`; with no messages the root stays in `hero`, that rule has no
match, and there is genuinely no gradient. So a scan of an empty profile returned "nothing paints
here" three times — correct, and useless.

The fix was not a better CSS scan. It was forcing the single state the bug lives in, and then the
gradient appeared on the first try.

**The lesson.** A visual bug that a user reports from a *used* app may not be reachable in a fresh
one. Before enumerating elements, ask what state the reporter was in, and if the harness cannot
reach it, force it. "I could not reproduce it" is a statement about the harness, not about the
bug, and it stayed literally true through three exploratory probes.

## L81 — The guard covered the shape the bug had, not the shape the bug takes

The backtick-in-a-template-literal hazard has recurred through this whole project. A gate was
written for it and it checks backticks inside CSS **comments** — the shape the bug had the time it
was written.

This turn the same character landed in CSS **content**: inside a declaration block, after I had
mechanically converted comments to single quotes and missed one. All 24 gates passed. The built
bundle still parsed — the stray text read as an identifier expression — so the failure was a
silently truncated stylesheet, which is the worst version of this bug and exactly what the
original gate was supposed to prevent.

**The lesson.** A guard written from one occurrence encodes that occurrence's shape. When the same
defect recurs in a different position, do not patch the guard's regex to include the new case —
ask what invariant the two cases share. Here it is "the literal must close at the end of its own
statement", which is one check for every position, rather than a growing list of places a backtick
might hide. Both plants that reproduce the two known shapes now fail the same gate.

## L82 — "Remove the gradient" would have passed the test and broken the feature

The scrim exists so content scrolling under the composer fades out. Deleting it makes the dark
band disappear — every pixel measurement would go green — and would leave a hard cut where a
soft fade belongs.

So the verification needed two claims, not one: the band is gone **and** the fade still works. The
second is not measurable by screenshotting a static page the way I tried it (the content has to sit
exactly under a sticky seat), so I checked it arithmetically instead: the ramp is 0 → 1 over 36px
in both versions, and only the destination colour moved. The comparison table of host-fill versus
card-fill over a red block is what made the difference obvious in one screen.

**The lesson.** When fixing a visual defect that is *produced by* a mechanism serving a purpose,
the verification has to assert both that the symptom is gone and that the purpose still holds.
Otherwise the cheapest passing fix is to delete the mechanism.

## L83 — "Overlapping" was the user's honest description of a truncation

The report was "the mode selectors are overlapping". Nothing overlapped: every pair of header
elements was disjoint in all four cards, both themes, both widths. The title was being ellipsised
to "Standar…", and the badge sat immediately after the ellipsis, so the two read as one collision.

Taking the word literally would have sent me looking for a z-index or a negative margin — neither
of which exists. Measuring the row immediately showed a 38px shortfall.

**The lesson.** A visual report describes what it LOOKS like, not the mechanism, and the words can
name a symptom that has a different cause. The translation step is not pedantry: "overlap" implies
stacking, "truncated beside a badge" implies flex sizing, and they lead to different files. Measure
before choosing which one you were told.

## L84 — Checking whether it was already broken changed the fix, not just the blame

The instinct was to find what the theme did to break this card. Measured with the theme OFF,
the name is still truncated — 75px of 104px needed — so the host's own layout does it, and the
theme's 24px of extra width does not close the gap.

That mattered beyond assigning blame: a fix premised on "the theme narrowed this card" would have
been to give width back, which was both impossible (the grid caps the card at any viewport) and
pointless (24px against a 38px shortfall). Knowing the defect was pre-existing is what made
"let the row wrap" the obvious answer.

**The lesson.** Before fixing a layout complaint, measure the same element with the change switched
off. It separates "I broke this" from "this was always broken and I made it visible", and those two
have different fixes. The theme-off measurement costs one line and had already settled several
earlier questions in this project (D50, D60).

## L85 — Gate 25 caught the same bug within seconds, and that is the point of a gate

Writing the fix's comment, I typed a backtick around an identifier — the exact hazard this project
has hit more than ten times, and the one that got through all 24 gates last turn.

This time gate 25 (added hours earlier) failed immediately, alongside the compile error: both named
the file and the line, and the literal was caught before a build could ship a truncated stylesheet.
No investigation, no guessing which rule had gone missing.

**The lesson.** A gate earns its cost the first time it turns a silent corruption into a one-line
error. Compare the two incidents: last turn the same mistake produced a bundle that *parsed*, a
stylesheet that was silently short, and a suite of green checks; this turn it produced "literal
terminated early at 50-feature-settings.js:420". Same bug, minutes apart, and the only difference
is that a guard now exists for the shape it actually takes.

## L86 — "Weird rectangle" was accurate, and the rectangle was the card showing through

The report described a rectangle around the queue row. There was no rectangle element: it was the
composer card visible in the 8px strip on each side of a tab that was 16px narrower than the
composer it sat on. The tab had a fill of its own, so the card showed only where the tab was
absent — a border-shaped artifact made of nothing but the mismatch.

Measuring width first is what found it. The panel was 829px against the composer's 861px, and no
amount of looking at fills, borders or shadows would have explained a rectangle that is actually
the gap between two boxes.

**The lesson.** When something looks like it has a border that is not in the CSS, measure the two
adjacent boxes' geometry before hunting for a border. "There is an outline" and "there is a gap"
look identical at a glance and have nothing in common in the fix.

## L87 — Removing one of a width's two subtractions leaves it still wrong

The dock's width and its padding both subtract the same 8px:

```css
width: calc(100% - side-clearance*2 - dock-inset*2);
padding: 0 dock-inset;
```

So it is inset twice over. I removed the padding, measured 845 vs 861, and the first reading of
that number was "the rule did not apply". It had applied — the padding was gone — and the width
still carried its own subtraction. Zeroing the two custom properties fixed both at once.

**The lesson.** When a box is nested inside an inset, the inset is frequently applied twice: once
as padding and once inside a `calc()` width. Removing the visible one leaves the invisible one.
The check that settles it is measuring the box against its intended outer width, not reading the
declarations.

## L88 — The simulation had to be mounted in the right parent before any of it was measurable

The queue dock only exists while a message is queued, which a fresh profile never has, so it had
to be simulated. The first mount put it in the composer's *hero* stack — the empty-session
container — and every candidate fix then showed a 90px gap to the composer that was an artifact of
my own placement, not of the CSS.

It only became measurable once the dock was inserted immediately before the real composer card,
inside its actual stack, where the host's own −9px margin could pull it flush. Then the junction
measured −1px and the width mismatch was the only real problem left.

**The lesson.** A simulated DOM node is only as good as its position. Mount it where the real one
lives — same parent, same sibling order — or the layout you measure is the layout you invented.
Three of the candidate screenshots in this task were discarded for exactly this reason.
## L89 � Two selectors that disagree make both of them worthless

Two of my own probes reported the text inset as 16 and as 28 for the same element on the same build.
Neither number could be trusted until the disagreement was explained, and the explanation was
arithmetic, not CSS: one probe measured from the card's left edge (`content.x + inset`) and the other
from the column's left edge (`content.x`). The gap between those two origins IS the card inset, so
they differed by exactly 12.

The fix was to print both origin candidates and both leaves in one dump, so the discrepancy has to
appear as a number � `insetFromCard` and `insetFromColumn` side by side � instead of as a
contradiction between two runs. Once both are in one row, the arithmetic is obvious and the probe is
trustworthy again.

A second instance of the same failure in the same task: a sweep reported the header rule matching 2
elements when it matched 1. The probe counted descendants (`[class*="header"]`) while the stylesheet
used a direct-child combinator. **A verification must measure the selector the code actually uses**,
not a broader one that looks equivalent � otherwise it reports a leak that does not exist, and the
next fix is made against a defect the probe invented.

**The lesson.** When two measurements disagree, do not pick the one that fits the narrative. Put both
origins in one output and let the difference show itself. And when checking a selector, reproduce its
exact combinators; a descendant search standing in for a child selector will find neighbouring
elements and call them leaks.

## L90 � A "cramped" report can be horizontal while you keep measuring vertical

The report was "the spacing feels kind of congested". My first instinct was the vertical rhythm: row
heights, text-to-text gaps, padding-block. All of it measured fine � 16px block padding on a 4px
rhythm, 32-39px between a description and the next label � and none of it was the problem.

The actual defect was one number doing two jobs. Because the row rule used the gutter for both the
fill bleed and the text inset, the text sat 12px inside a card whose corner radius is 16px: every
label started inside the arc. That is horizontal, structural, and invisible to any measurement of
vertical rhythm.

**The lesson.** When someone says "spacing", read every edge before choosing an axis. The check that
found it was comparing the text's left edge against the CARD radius � a comparison across two
different properties that nobody had thought to make, because each property was individually correct.

## L91 � Verify a spacing change against the un-themed host before blaming the theme

Raising the cell inset to 16px made the Appearance control wrap at 826px, and my verify suite flagged
it as a failure of the change. It was not: the un-themed host row is 542px against 556px needed at that
width, so "System" wraps with no theme loaded at all.

The lesson generalises to every layout change. A regression check that runs only against the modified
build cannot tell "my change caused this" from "this was already true". The three-way probe � theme
off, theme before the change, theme after � costs one extra browser context and converts a suspicion
into a fact. Without it, the honest options are to revert a correct fix or to ship an unverified one.
## L92 � Two motion layers exist, and neither one is retunable from a single place

Auditing every animation in the harness produced a fact no single file states: the shell
(`dsh-web-frontend`) and the component layer (31 `dsh-client-ui-*` packages) carry **separate**
motion systems that only partly share tokens. The shell has 14 `@keyframes` and 37 motion rules;
the component layer has 179 declarations shipped as CSS strings inside each `client.js`.

The shell reads the theme's duration tokens in **4 of its 37** motion rules (11%), and never reads
`-fast` or `-slow`. So the intuitive plan � "retime the app by setting `--ds-transition-duration`" �
moves one rule in nine. Across both layers there are 27 distinct durations and 12 distinct easings,
including 52 uses of `.12s` that no token reaches.

**The lesson.** Before promising a themeable property, count how many declarations actually read the
token. A design token that is declared, documented and correct can still govern almost nothing. The
check is a grep for `var(--the-token)` across every layer, not a read of the token definition.

## L93 � "Unguarded" was a parser artifact, and it inverted the finding

My first reduced-motion audit reported 12 of 14 keyframes as unguarded. The truth is 3. The bug was
the question, not the parsing: it asked *"does a reduced-motion block mention this keyframe's name?"*
A guard cancels motion by writing `animation: none` on the **carrier selector** and never repeats the
keyframe's name, so every guarded animation looked unguarded.

The second attempt used a hand-rolled `@media` flattener and found 2 of the 10 blocks � a different
wrong answer from the same area. Only the third approach, reusing the brace matcher that had already
found all 10 blocks and then matching **selectors** rather than names, produced 11 guarded / 3
unguarded, which is what the live page confirms.

**The lesson.** An accessibility audit that reports a defect must first prove the detector works on a
case that certainly has the guard. Two of my three attempts would have shipped a false finding about
the harness's a11y in a document meant to be a reference.

## L94 � A doc that states counts has to be checked against the measurement that produced them

The animation inventory makes ~18 numeric claims (14 keyframes, 37 rules, 179 declarations, 31
packages, 4 WAAPI calls, 4 of 37 tokenised). I wrote a verifier that recomputes every one from the
asar and compares it to the claim.

It failed one: the doc said the shell "never" reads the duration token; it reads it 3 times plus 4
easing uses. The prose was written from an earlier grep that only looked for `-fast`, which the shell
genuinely never uses � a true observation about one token generalised into a false statement about
the family.

**The lesson.** When a document's value is its numbers, the numbers need a checker, for the same
reason the build has gates. The failure mode is quiet: a slightly wrong count reads exactly like a
right one, and this doc will be cited later as the map for custom animation work.
## L95 � A click that lands by coincidence is not a navigation test

The plugin-detail page verification failed eight assertions in a row, and every one of them was
false. The page exists. My probe clicked the middle-left of the plugin card, which did nothing --
the row opens from a **title button** (`button.X_2TxG_cardTitle`), not from the card body.

What makes this worth recording is that an EARLIER probe had "succeeded" at the same task: it clicked
different coordinates, which happened to fall on the title. So I had one green run and one red run of
the same claim, and neither was trustworthy -- the green one because it passed by accident, the red
one because it tested the wrong element.

The fix was to name the target: query `button[class*="cardTitle"]`, click its centre, assert the URL
or the slot set changed. Re-run twice from a clean profile, all eight checks pass.

**The lesson.** When a probe clicks something, it must name what it clicks and verify the state
changed. Coordinates that "work" are indistinguishable from coordinates that hit a neighbour. Two
clicks that disagree about the same claim mean the instrument is broken, not that the claim is
uncertain -- and the first instinct is to debug the product instead of the probe.

## L96 � The harness already had most of the reference, which changed the whole estimate

The brief was "look at this reference and tell me what is achievable". The expensive-looking part of
it was a plugin **detail page**: hero with version pill and status badge, a Components list, a
source card, a dark update tile. Building that would have been a multi-day feature.

It already exists. `plugins.detail.actions` / `.badge` / `.section` are three free list slots on a
page the host renders today at Plugins -> any installed plugin. The reference's Source card and
Update tile are two components mounted into `plugins.detail.section`; the version pill is
`plugins.detail.badge`. So the honest estimate went from "build a page" to "restyle it and add two
tiles".

**The lesson.** Before estimating a reference, check whether the product already ships the surface it
depicts. Reading the slot registry (`plugins.detail.*` alongside 103 other slot ids) took minutes and
removed the largest item from the estimate. A design reference shows an outcome; it does not say
whether that outcome is missing or merely unstyled.

## L97 � Two of twenty-four elements were impossible, and only one of them mattered

The reference carried a dark usage tile: token count, dollar balance, off-peak window, billing
period. Measured on a live instance, the DOM holds no token count, no balance and no currency figure
at all -- the client plugin API has no usage or billing service, and peak/off-peak is a pricing
policy the app does not model.

The other impossible element was fake Windows window chrome, which is Electron's and is not worth
discussing. The usage tile is the interesting one: it is the element a reader would most likely
assume is easy, because it *looks* like static decoration, and it is the only one in the reference
that needs a data source that does not exist.

**The lesson.** Split a feasibility list by what the element needs, not by what it looks like:
styling, DOM, data. The 22 achievable items grouped cleanly into "change values" (8), "write CSS" (6)
and "mount a component into a free slot" (3) -- and only the last group carried real risk. The
impossible one was impossible for a data reason no amount of CSS or slot work would fix.
## L98 � Computed styles cannot see composition, and the screenshot caught what they missed

The hero panel passed every assertion I wrote: radius 16, background set, accent border set. It was
also visibly wrong. The screenshot showed a small box holding an icon and a switch, with the plugin's
name floating underneath it, outside the panel.

The cause was structural, not stylistic. The host renders the hero as TWO SIBLINGS - `_detailTop`
(crumb, icon, actions) and `_detailMain` (title, tags, package, description) - and I had painted only
the first. Every property I measured was on an element that was correctly styled and wrongly scoped.

The fix was one selector change plus one new assertion class: the verify harness now checks that the
panel CONTAINS the title's rect, not just that the panel has a border. That is a geometry check, and
it is the only kind that could have failed here.

**The lesson.** Assertions about an element's own properties cannot detect that the element holds the
wrong content. For any container, assert a RELATIONSHIP - containment, ordering, alignment with a
sibling - not a solo property. And when a value check passes on something that looks broken, the
check is measuring the wrong thing rather than the code being fine.

## L99 � The same wrong box can be made wrong twice, by two different mechanisms

The hero panel was 1000px wide inside a 960px column. Cause: `margin-inline: -20px`, a technique that
is correct for the Settings rows (where the row must bleed past its parent's padding) and wrong here
(where the parent is already the full column).

I removed the margin and added padding instead. It measured 1002px. Different mechanism, same
mistake: the host's reset does not apply `box-sizing: border-box` to that element, so padding adds to
the width rather than coming out of it.

**The lesson.** "Replace the margin with padding" is only an equivalent fix when the box is
border-box. On a content-box element both techniques widen the box by the same amount, so the second
attempt reproduces the first failure with a different declaration and looks like a new bug. Check
`box-sizing` before treating padding and margin as interchangeable, and re-measure rather than
assuming the swap fixed it - the two attempts differed by 2px, which is exactly the kind of number
that reads as noise.

## L100 � A toast-shaped failure in the doc: I quoted `root: ""` as "theme off"

While capturing the Phase 1 baseline I read `root: ""` from `document.documentElement.getAttribute(
'data-dsh-bento')` and briefly concluded the theme was disabled. It is not: the attribute is present
with an empty value, which is exactly what `setAttribute(ROOT_ATTR, '')` writes. The theme was on for
every measurement.

No measurement was wrong, because I checked the flag again before trusting it - but the near-miss is
worth recording. `getAttribute` returns `""` for "present but empty" and `null` for "absent", and the
difference matters for every boolean attribute this theme uses: `data-dsh-bento`, `aria-selected`,
`data-ds-dark-theme`.

**The lesson.** For a presence attribute, test `hasAttribute`, never the truthiness of
`getAttribute`. The two disagree on exactly the case the theme uses everywhere, and the failure mode
is a correct measurement plus a wrong label on it.

## L101 � One harness bug produced 66 false failures, and the identical count with the theme off was the tell

My overflow check reported 66 violating elements in both themes. Before touching the CSS I ran the
same check with every feature disabled: it reported **66 again, with identical elements**. That
number is the signature of a broken instrument, not a broken theme.

The bug: the reference box was `[data-slot="main"]`, which is a zero-width wrapper, so every child
"overflowed" it by its full width. The reference is now the nearest clipping scroller, and the check
skips itself (rather than passing) when that box is not real.

**The lesson.** A failure count that does not change when the feature under test is removed is
measuring the harness. Run every new check once with the change disabled before believing it: it
costs one browser context and it is the difference between a defect and a false alarm.