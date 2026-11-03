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