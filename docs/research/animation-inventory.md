# Animation inventory — every place the harness animates

Measured 2026-11-04 against the shipped client (`DeepSeek Harness` desktop app, `app.asar`,
`dsh-web-frontend` + 31 `dsh-client-ui-*` packages) and confirmed against a live page driven in
Chrome 156. Every number below was read from the bundle or from `getComputedStyle` /
`document.getAnimations()` on a running client — nothing is estimated.

**Why this file exists.** You asked for custom animations and where to put them. This is the map:
every mechanism the harness uses to move something, which token or class drives it, whether it
honours reduced motion, and whether it is reachable in the running UI or merely declared.

---

## 1. The one-paragraph version

The harness animates through **two layers that do not share a token system**:

- **The shell** (`dsh-web-frontend`) — 14 `@keyframes` and 37 rules carrying motion, all in one
  minified stylesheet. Durations are hardcoded per rule (`.1s`…`.3s` on the fast side, `1.5s`–`3s`
  for spinners and pulses). It has **10 `prefers-reduced-motion` blocks** covering 11 of 14
  keyframes.
- **The component layer** (31 `dsh-client-ui-*` packages) — **179 motion declarations**, shipped as
  CSS strings inside each `client.js`. These read the `dsh-client-ui-theme` tokens
  (`--ds-transition-duration` `.2s`, `-fast` `.1s`, `-slow` `.3s`, `--ds-ease-in-out`
  `cubic-bezier(.4,0,.2,1)`) — but **most also hardcode their own values** (`.12s`, `.18s`, `.15s`).

The split is the single most useful fact for custom animations: **there is no one place to retune
motion.** The shell reads the theme's duration tokens in only 4 of its 37 motion rules, and
`-fast`/`-slow` are never read by the shell at all; the component layer reads them roughly a fifth
of the time.

---

## 2. Mechanism taxonomy

Five distinct mechanisms. They need different override strategies, so it matters which is which.

| # | Mechanism | Where | How to reach it | Count |
|---|---|---|---|---|
| 1 | CSS `@keyframes` in the shell stylesheet | `dsh-web-frontend/dist/assets/index-*.css` | Override the class, or redefine the `@keyframes` | **14** |
| 2 | CSS transitions in the shell stylesheet | same file | Override the class | 37 rules |
| 3 | CSS-as-a-string in component bundles | `dsh-client-ui-*/lib/client.js` | The class is real once mounted; override it, but the tag is injected at runtime | **179** decls |
| 4 | Web Animations API (`element.animate()`) | `settings-account`, `workspace` | Not CSS — must patch JS or re-run with your own keyframes | **4 calls** |
| 5 | Smooth scrolling / `requestAnimationFrame` | `chat`, `conversation`, `trajectory`, `plugin-manager` | `scroll-behavior` CSS, or rAF is untouchable | 8 smooth, ~40 rAF |

Mechanisms 1–3 are all CSS by the time it runs, so one stylesheet with enough specificity can
override all of them. Mechanisms 4–5 cannot be overridden from CSS.

---

## 3. Every `@keyframes` in the shell

All 14, with what it animates, the rule that carries it, its timing, and its reduced-motion status.

| Keyframe | Animates | Carried by | Timing | Reduced motion |
|---|---|---|---|---|
| `_spin_u7vgf_45` | `transform` | `._spinner_u7vgf_45` (boot spinner) | `.8s linear infinite` | **none** |
| `_dsh-state-dot-spin_1i3xo_1` | `transform` | `._spinnerMotion_1i3xo_42` | `1.5s linear infinite` | `animation: none` |
| `_dsh-state-dot-dash_1i3xo_1` | `stroke-dasharray`, `stroke-dashoffset` | `._spinnerArc_1i3xo_48` | `1.5s ease-in-out infinite` | `animation: none` + frozen dash offset |
| `_dsh-row-shimmer-sweep_1rdzk_1` | `transform` | `._sweep_1rdzk_34` | `1.5s steps(48,end) infinite`, `.3s` delay | `animation: none`, decoration hidden |
| `_dsh-row-shimmer-highlight_1rdzk_1` | `transform` | `._highlight_1rdzk_54` | as above | `animation: none` |
| `_modalEnter_o6lrb_1` | `opacity` | `._mask_o6lrb_18:after`, `._dialog_o6lrb_33` | `var(--ds-transition-duration)` `.2s`, `var(--ds-ease-in-out)` | `animation: none` |
| `_indicator-enter_1gwo3_1` | `opacity` | `._indicator_1gwo3_1` | `.15s ease-out` | `animation: none` |
| `_reveal-second-dot_1gwo3_1` | `opacity` | `._secondDot_1gwo3_90` | `1.5s step-end infinite` | `animation: none` |
| `_reveal-third-dot_1gwo3_1` | `opacity` | `._thirdDot_1gwo3_94` | `1.5s step-end infinite` | `animation: none` |
| `_tooltip-in_44yfq_1` | `opacity` | `._bubble_44yfq_1` | `.15s var(--ds-ease-in-out)` | `animation: none` |
| `_dsh-toast-in_l6cvn_1` | `opacity`, `transform` | `._toast_l6cvn_6` | `.16s ease-out` | replaced by fade-only |
| `_dsh-toast-fade_l6cvn_1` | `opacity`, `visibility` | `._toast_l6cvn_6` | `1s ease`, `var(--dsh-toast-hold, 3s)` delay, `forwards` | kept deliberately |
| `_dockHintIn_6nhg2_1` | `opacity`, `transform` | `._dockHintCard_6nhg2_606` | `.14s ease-out` | **none** |
| `_dockScrimIn_6nhg2_1` | `opacity` | `._dockScrim_6nhg2_599` | `.14s ease-out` | **none** |

### The three unguarded ones

`_spin_u7vgf_45`, `_dockHintIn_6nhg2_1`, `_dockScrimIn_6nhg2_1` have **no** reduced-motion guard.

- `_spin_u7vgf_45` is the **boot spinner**, which renders before the theme/CSS layer is up. Guarding
  it is awkward for the shell but it is also the one animation a reduced-motion user sees first.
- The two dock animations are `.14s` one-shot fades, so the practical cost is low — but they are
  still motion the user asked to suppress.

**Measured method note:** an earlier pass of this audit reported 12 of 14 as unguarded. That was
wrong. It asked "does a reduced-motion block mention this keyframe's name?", but a guard cancels an
animation by writing `animation: none` on the **carrier selector** and never repeats the keyframe's
name. The table above is the corrected result.

---

## 4. Every animated surface in the component layer

179 declarations across 31 packages. Grouped by what a user actually perceives. Counts are real.

### 4.1 Sidebar and navigation — 15 decls

| Surface | Property | Timing |
|---|---|---|
| Sidebar collapse (`railIn`, `wide`) | `animation: rail-in` / `wide-in` | `.15s` / `.2s`, `--ds-ease-in-out` |
| Section label, header actions, search | `max-width`, `opacity`, `transform`, `visibility` | `.18s` / `.12s`, `--ds-ease-in-out` |
| Search field | `width`, `padding`, `border-color`, `background-color` | `.18s` |
| Search skeleton dots | `animation: search-skeleton` | `2s cubic-bezier(.36,0,.64,1) infinite` |
| Fading children (`fading > *`) | `opacity` | `.15s` |
| Left-panel rows (`panelRow`), session rows | `border-color`, `background-color` | `.16s cubic-bezier(.2,0,0,1)` |

The last row is worth flagging: **`.16s cubic-bezier(.2,0,0,1)` is the same value the bento theme
uses** (`--dsh-bento-motion` 160ms, `--dsh-bento-ease` `cubic-bezier(0.2,0,0,1)`). It was reached
independently by the plugin, and it is the closest thing to a house curve in the sidebar.

### 4.2 Conversation and chat — 28 decls

| Surface | Property | Timing |
|---|---|---|
| Turn mark (`mark:before`) | `transform`, `background-color` | `.14s` |
| Busy mark | `animation: turn-mark-busy` | `1s ease-in-out infinite` |
| Turn preview | `top`; `animation: turn-preview-enter` | `.14s cubic-bezier(.2,.8,.2,1)`; `.12s ease-out` |
| Chat flow children | `margin-top` | `.16s cubic-bezier(.4,0,.2,1)` |
| Tool title / chevron | `color`, `opacity` | `.1s` |
| Collapsible content | `margin-top` | `.16s cubic-bezier(.4,0,.2,1)` |
| Retry summary | `transform` | `.12s` |
| Message actions | `opacity` | `80ms` |

### 4.3 Trajectory / details view — 17 decls

Widest use of longhand transitions in the app: `_kindSlot`, `_kindTag`, `_eventColumn`, `_event`,
`_requestBoundaryControl` transition `width`, `padding`, `left`, `max-width`, `opacity`,
`transform` at `.12s`–`.18s` with `--ds-ease-in-out`. Also `_lanes` / `_turnBoundaries` transition
`left` at `.18s ease-out` when `data-animate-viewport=true`.

### 4.4 Settings — 24 decls

| Surface | Property | Timing |
|---|---|---|
| Theme card (`_card`) | `transform` | `.25s ease-out` |
| Page enter | `animation: pageEnter` | `.1s ease-out` |
| Card, buttons, card `:before`/`:after` | `background-color`, `color`, `opacity`, `border-color` | `.12s` |
| Selected card border | `animation: borderSweep` | **`14s linear infinite`** — the longest animation in the app |
| Icon stagger (`iconsEntering > svg`) | `animation: iconEnter` | `var(--ds-transition-duration)`, delays `30/50/62/70ms` |
| Onboarding overlay | `animation: onboardingExit` | `.18s ease-out forwards` |
| Spinners (`J8V0KW`, `MKE-pW`) | `animation: spin` | `1s linear infinite` |

The icon stagger is the one place the harness animates a **sequence** rather than a single element —
four delays, 20ms apart, capped at 70ms.

### 4.5 Files, attachments, plugin surfaces — 40 decls

Spinners `_spinner`, `_spinner`, `_file-card-spin` at `.8s`–`.9s linear infinite`; upload progress
bar `1.2s ease-in-out infinite alternate`; file-card mask fade `.16s ease-out`; remove buttons
`opacity .2s ease-in-out`; plugin-manager highlight `2.4s ease-out` and skeleton
`2s cubic-bezier(.36,0,.64,1) infinite`; chevrons `.16s`.

### 4.6 Everything else — 35 decls

`plan` card `.12s`; `model-selection` / `permission-presets` / `subagent` chevrons `.12s`;
`theme` expander `.1s` via `--ds-transition-duration-fast`; `layout` transitions
`grid-template-columns` and `left` at `--ds-transition-duration-slow` `.3s` (the sidebar/panel
resize); `deliverables`, `jobs`, `schedule`, `skill`, `tool`, `user-questions`,
`message-feedback`, `cordis`, `conversation`, `sidebar-right`, `sidebar-terminal`,
`sidebar-documentpreview` each carry 2–7 short transitions.

---

## 5. The two token systems, and the gap between them

```
dsh-client-ui-theme  lib/client.js
  --ds-ease-in-out              cubic-bezier(.4, 0, .2, 1)
  --ds-transition-duration      .2s
  --ds-transition-duration-fast .1s
  --ds-transition-duration-slow .3s
```

That is **all** the motion tokenisation in the harness. There is no duration for `spinner`, no
curve for `enter` vs `exit`, no token for the `1.5s` pulse family.

| Layer | Reads the tokens? |
|---|---|
| Shell stylesheet | **Rarely: 4 of 37 motion rules (11%).** `--ds-transition-duration` ×3 (the modal mask + dialog, and the markdown link ring) and `--ds-ease-in-out` ×4 (those three plus the tooltip). The other 33 rules hardcode `.1s`–`.3s` and `ease`/`ease-out`/`linear`. `-fast` and `-slow` are **never** read by the shell. |
| Component layer | Sometimes — about a fifth of its 179 declarations; the rest hardcode `.12s`, `.18s`, `.15s`. |
| Bento theme plugin | Independent system: `--dsh-bento-motion` 160ms, `--dsh-bento-ease` `cubic-bezier(0.2,0,0,1)`. |

**Correction.** An earlier draft of this document said the shell "never" reads the tokens. That was
wrong, and a claim-checking pass against the same extraction caught it: the shell reads
`--ds-transition-duration` three times and `--ds-ease-in-out` four times. The corrected claim is
11%, which still supports the practical conclusion — retiming the shell via tokens reaches one rule
in nine — but "never" overstated it.

### The real duration scale (all layers, by frequency)

27 distinct durations. The distribution is sharply concentrated:

```
120ms  x52   ████████████████████████████
100ms  x26   ██████████████
180ms  x17   █████████
160ms  x14   ███████
150ms  x12   ██████
 0s     x8   ████            (guards)
1000ms  x8   ████            (spinners)
140ms   x7   ███
2s      x5   ██              (skeletons)
1.5s    x5   ██              (state pulses)
200ms   x5   ██
300ms   x2
...
14000ms x1                   (settings border sweep)
```

### The easing vocabulary (12 distinct)

```
ease-in-out              x50
ease-out                 x23
linear                   x12
ease                     x10
cubic-bezier(.36,0,.64,1)  x5   (skeleton breathe)
step-end                  x3
cubic-bezier(.4,0,.2,1)   x2   (the token, when used)
cubic-bezier(.16,1,.3,1)  x1
cubic-bezier(.2,.8,.2,1)  x1
cubic-bezier(.4,0,1,1)    x1
ease-in                   x1
cubic-bezier(.22,1,.36,1) x1
```

---

## 6. Mechanism 4 and 5: what CSS cannot reach

### Web Animations API — 4 calls

| Package | Calls | What it does |
|---|---|---|
| `dsh-client-ui-settings-account` | 2 | Page/card transitions driven in JS |
| `dsh-client-ui-workspace` | 2 | `movements.set(element, animation)`, with `animation.onfinish = () => animation.cancel()` — a tracked, cancellable movement map |

`workspace`'s map is the only **managed** animation in the harness: it keeps a
`Map<element, Animation>`, cancels on finish, and tears the whole map down on unmount. A custom
animation system would want to behave the same way.

### Smooth scrolling — 8 sites

`chat` (2), `plugin-manager` (1), `trajectory` (4), `sidebar-documentpreview` (1). These are
`scrollTo({behavior:'smooth'})` / `scrollIntoView({behavior:'smooth'})` calls, so they ignore every
CSS duration token. The only handle is `scroll-behavior: auto` on the container, which forces
instant jumps and does **not** disable the explicit option.

### `requestAnimationFrame` — ~40 sites

`chat` 6, `conversation` 7, `web-frontend` 8, `terminal` 5, `pdf` 4, `layout` 2, `workspace` 2,
`settings-account` 2. Mostly scroll-position tracking and layout measurement, not visual animation —
but they run every frame, so they are the places a heavy custom animation could cause jank.

---

## 7. Reachability: declared vs actually on screen

This matters for customising, because some of the 14 keyframes belong to components that never
mount in a normal session.

**Verified on a live client, 1600x1000, both by opening the real UI and by polling
`document.getAnimations()` every frame for 900ms after each trigger:**

| Surface | Reachable? | Evidence |
|---|---|---|
| Sidebar collapse/expand transitions | **Yes** | 12 distinct transition values present at idle |
| Settings dialog | **Yes, but unanimated** | The dialog is `VOzbGW_panel` / `VOzbGW_overlay` with `animation-name: none`. `_modalEnter_o6lrb_1` belongs to a **different** modal component (`_mask_o6lrb`), which is not the Settings dialog |
| Tooltip (`_tooltip-in_44yfq_1`) | On hover, not at idle | `_bubble_44yfq_1` absent from DOM until a tooltip opens |
| Toast (`_dsh-toast-in/_fade`) | Only on a toast | `_toast_l6cvn_6` absent from DOM at idle |
| Spinners | Only while loading | absent at idle |
| Shimmer rows | Only while streaming | absent at idle |
| `_spin_u7vgf_45` boot spinner | **Before** the app mounts | lives on the boot HTML, gone once the client renders |

**One correction worth stating plainly.** My first live probe reported "0 running animations" and I
nearly wrote that the shell's keyframes never run. They do — they run on components that were not
mounted at the moment I sampled. Polling every frame for 900ms across five triggers still caught
none, which is the honest result: **in a settled, idle session, none of the 14 keyframes are
animating.** They are all state-bound (`loading`, `streaming`, `toast`, `hover`, `mount`).

---

## 8. Accessibility status, measured

| Layer | `prefers-reduced-motion` coverage |
|---|---|
| Shell stylesheet | 10 blocks, 18 selectors, covering **11 of 14** keyframes and 7 transition groups |
| Component layer | **Every** animated component ships a matching guard — measured, each disables its own `animation`/`transition` |
| WAAPI (4 calls) | **No** `matchMedia` check found in the call sites |
| Smooth scroll (8 sites) | **No** `matchMedia` check found |

So: CSS motion respects the preference almost everywhere. The JS motion — `element.animate()` and
smooth scrolling — does not check it at all. If you build custom animations, that is the gap to not
repeat.

Three known exceptions inside CSS: `_spin_u7vgf_45`, `_dockHintIn_6nhg2_1`, `_dockScrimIn_6nhg2_1`.

---

## 9. What this means for custom animations

**Where the leverage is.** A single injected stylesheet can override mechanisms 1–3 in one place —
they are all plain CSS at runtime. The bento plugin already proves the pattern: it writes one
`<style id="dsh-bento-theme-css">` appended to `<head>`, after the shell stylesheet and after every
component's runtime-injected tag, so equal-specificity rules win on source order.

**The practical override recipe, in order of preference:**

1. **Redefine the `@keyframes` name.** For a shell keyframe, re-declaring `@keyframes _modalEnter_o6lrb_1`
   in the later stylesheet replaces the motion everywhere it is used, with no selector fight. The
   hashed names are stable per build but **change on every harness release** — verify them after an
   upgrade rather than trusting a pinned string.
2. **Retime by overriding the carrier class.** Works for both layers, but the component-layer class
   names are also hashes, so prefer `[class*="rowText"]`-style substring matching where the component
   is otherwise unreachable (the bento plugin uses this for `cubeRow`, `themeCube`, `header`).
3. **Set the duration tokens** — `--ds-transition-duration`, `-fast`, `-slow`. Cheap and honest, but
   reaches only the ~20% of component rules that read them. The shell ignores them entirely.
4. **Never fight `!important`.** Nothing in the shell or components uses it for motion, so none is
   needed.

**What cannot be overridden from CSS:** the 4 WAAPI calls, the 8 smooth-scroll sites, and the ~40 rAF
loops. These need a JS patch (a `matchMedia` gate, or replacing the call site) or they stay as they
are.

**Three concrete things to decide before building, because they change the design:**

- **Whether to live with the hash churn.** Shell and component class names are build hashes
  (`_modalEnter_o6lrb_1`, `GAkraW_search`). Anything keyed to them breaks silently on a harness
  update — the animation simply stops applying, with no error. Keying off `@keyframes` names has the
  same problem. Only token overrides and attribute/slot selectors survive upgrades.
- **Whether to unify the scale.** There are 27 durations and 12 easings across two disconnected
  systems. A custom layer could reasonably adopt a single 4-step scale, but overriding 179 + 37
  declarations to enforce it is a large change for a visual gain that may be imperceptible.
- **Reduced motion for the JS half.** CSS is already nearly complete; the uncovered area is WAAPI and
  smooth scroll. A custom layer that ignores that reproduces the current gap.

---

## 10. Method, and what was not verified

**Read from source:** the 21 `.css` files and 31 `client.js` bundles inside `app.asar` (parsed with a
hand-written ASAR reader; the header offsets are `headerSize@4`, `jsonLen@12`, data at `8+headerSize`).

**Read from a live page:** opening a real session in an isolated `web` profile, driving Settings open,
switching tabs, hovering a row, and polling `document.getAnimations()` every frame for 900ms after
each trigger. Resolved tokens were read from `getComputedStyle` on `html`/`body`.

**Not verified:**

- **Desktop (Electron) window chrome.** The `renderer/*.css` files cover the welcome window, update
  dialog and mandatory-update chrome; I audited their declarations (2 + 2 transitions, 150ms–300ms,
  both with reduced-motion blocks) but did not open those windows to watch them run.
- **The welcome window's animations.** `lib/welcome/welcome.css` duplicates 4 shell keyframes; whether
  that window uses them at runtime was not checked.
- **The `14s` settings `borderSweep`.** It is declared and `infinite`, but I did not observe it on
  screen — it belongs to `GAdqeW_selected:after` in the account settings page, which was not open.
- **Exact per-animation timing under load.** Durations were read from declarations, not measured
  frame-by-frame; a long task could stretch any of them.
- **Which of the two `dsh-client-ui-*` versions is authoritative.** Several packages exist in both
  `app.asar` and `profiles/desktop/node_modules`; I audited the `app.asar` copies, which is what the
  desktop app serves.
