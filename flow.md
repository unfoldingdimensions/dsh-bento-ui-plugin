# Flow

The canonical sequences. Where a step exists because an earlier one failed, the
failure is named — that is the part worth not rediscovering.

---

## 1. Add or change one feature

```
1. Write src/NN-feature-<name>.js
   └─ FEATURES.push({ id, title, about, order, enabled, css, setup? })

2. node build.mjs            → regenerates client.js from src/
3. node --check client.js    → syntax gate (caught a template-literal bug twice)
4. node verify.mjs           → 13 checks, exit non-zero blocks install

5. Test in the ISOLATED profile, not desktop:
   a. junction the package into profiles/web/node_modules
   b. append the insert row to profiles/web/cordis.patch.yml
   c. dsh --profile web --port 51999 --no-open
   d. drive headless Chromium at /?token=<token>

6. Inspect the RENDERED result, not the source:
   - document.documentElement.hasAttribute('data-dsh-bento')
   - #dsh-bento-theme-css present, and its token layer inside
   - every expected [data-dsh-bento-part] stamped
   - getComputedStyle on the card: background, border, radius
   - screenshot, and actually look at it

7. Tear the test down (see §5). Only then report.

8. Install into desktop via plugin_manager install_bundle.
   A running page keeps the module generation it booted with:
   a reload or restart is required before the change is visible.
```

**If step 6 fails, fix and repeat from 2. Do not proceed to 8 on static evidence.**

---

## 2. The Chrome-before-the-app loop (required for every UI change)

This is §1 steps 5–7 expanded, and it is the rule (D12). The isolated profile is
not optional and neither is measuring: an opinion about how CSS looks is not
evidence.

```
PROBE      measure the thing you are about to restyle
           └─ probe-settings-dom.cjs, probe-settings-metrics.cjs,
              probe-all-sections.cjs  → real structure, real numbers

SELECT     prove each selector matches exactly what you intend, before writing CSS
           └─ probe-selectors.cjs   → count + sample per candidate selector
           a selector matching 0, or 3 when you wanted 1, is a defect

WRITE      src/NN-feature-<name>.js, tokens only, no literal colour

GATE       node build.mjs && node --check client.js && node verify.mjs

RENDER     verify-settings.cjs            → computed styles of the finished panel
           verify-settings-themes.cjs     → light AND dark, all sections
           verify-settings-hover.cjs      → interaction states

MEASURE    every claim as a number:
           - contrast ratio between the two surfaces, computed not eyeballed
           - box geometry: did any host control change size or wrap
           - element counts: rows styled, rules removed, tinted rows
           - label x/y before and after a hover

DISAGREE?  If computed style and the screenshot disagree, read the screenshot's
           pixels. Text anti-aliasing reads as a grey band at a glance and is not
           a style. Resolve it with data, not with a second look.

REPEAT     fix and return to GATE. A regression found here costs minutes;
           the same regression shipped to the app costs an outage (L1).

TEARDOWN   §5, and confirm the web profile is byte-identical

APPLY      rebuild for desktop, then tell the user a reload is required
```

**What "done" means.** Not "the CSS matches", not "the selector resolves", not
"the install reported applied". Done means: in light **and** dark, on **every**
section that shares the surface, the measured contrast, geometry and control
layout are what was intended, and a screenshot was looked at.

---

## 3. Diagnose "the plugin loaded but nothing happened"

Run in this order. Each step eliminates a whole class of cause.

```
1. Is the plugin ACTIVE on the host?
      plugin_manager list_plugins → fiberPhase === 'active'
      (cordis_inspect_query Config → patchId present)

2. Did the CLIENT half register anything?
      cordis_inspect_query client Slots → settings.general.item
      → 'bento-theme' occupant present?

   absent → the client module never ran. Check:
      - is the package in the boot roster? window.__DSH_BOOT__.entries
      - does its row carry a url and rev?
      - fetch that url; status must be 200
      - new Function(source) — must parse

3. Is the stylesheet injected?
      document.getElementById('dsh-bento-theme-css')

   absent → apply threw or never ran. Read the boot audit text
   (it distinguishes 'loading' from 'failed' — see architecture §2).

4. Are the tokens RESOLVING?
      getComputedStyle(document.body).getPropertyValue('--dsh-bento-card')

   empty → the surface tokens are declared on the wrong element
   (custom properties do not inherit upward — architecture A5).

5. Are the shell parts stamped?
      document.querySelectorAll('[data-dsh-bento-part]')

   none → the observer missed the shell (activation precedes render —
   architecture A6). It must observe document.body.

6. Is the settings row really absent?
      OPEN Settings first. settings.general.item only renders while the
      panel is open. Checking at boot always reports 'absent'.
```

Steps 4 and 5 were both reported as "the plugin is broken" when in fact it was
running correctly and painting nothing.

---

## 4. Recover from a boot failure

A bundle whose host half fails aborts application startup:

```
web boot: 1 entry did not activate
dsh-bento-theme: <loading|failed>
```

The user is offered recovery, including **"Disable third-party plugins, back up
profile patch, and restart"**. That button is destructive:

```
1. Note the crash log path from the dialog.
       %APPDATA%\@deepseek-ai\dsh-desktop\logs\crash-*-web-boot.log

2. Read it. It records the audit line, and for each failing entry the reason.

3. Check what recovery changed before assuming the app is healthy:
       cordis.patch.yml size and row count   (was 5278 / 18 → 1345 / 5)
       dsh.profile.bundles                   (24 → 17)
   Recovery rewrote the patch and disabled third-party bundles.

4. Restore the patch from the automatic backup and VERIFY byte-for-byte:
       cordis.patch.yml.bak-<timestamp>
       compare length and content, then parse it and assert key contents
       (18 rows, both providers, 9 models)

5. Re-enable the bundles recovery disabled — but compare against the list from
   before the incident. Do not re-enable something the user had turned off.

6. Leave the offending bundle DISABLED.

7. Re-check: no new crash log in the last N minutes is the pass condition.
```

---

## 5. Isolated-profile test loop (safe)

```
setup:
  mklink /J "%DSH_HOME%\profiles\web\node_modules\dsh-bento-theme" "<abs package dir>"
  append to profiles/web/cordis.patch.yml:
    - insert:
        - id: ui-bento-theme
          name: dsh-bento-theme
  (copy cordis.patch.yml to .bak first — always restore it afterwards)

run:
  dsh --profile web --port 51999 --no-open
  parse the printed ?token= from stdout

drive:
  playwright-core (from the desktop profile's node_modules) + Chrome
  goto /?token=<token>   (303 → cookie, then load /)

teardown (do not skip):
  rmdir the junction
  restore cordis.patch.yml from the .bak and delete the .bak
  confirm the web profile contains no bento reference
  stop the background job
```

A symlink needs administrator rights on Windows; a **directory junction**
(`mklink /J`) does not.

---

## 6. Report

Order the report by what the reader must decide, not by what was done:

1. What was verified, and how (the method, not the claim).
2. What was **not** verified, stated plainly.
3. Any mistake, and its correction — including an earlier wrong conclusion that
   the new evidence overturns. Say which earlier claim is superseded.
4. Profile health after the work.
5. The single next action, with the cost of taking it.

Never let "installed" or "slot registered" stand in for "renders correctly".

---

## 7. The pass plan

The reference-inspired redesign ships in four passes. Each is verified in Chrome
against the isolated profile (§2) before the next begins.

| Pass | What | Mechanism | State |
|---|---|---|---|
| 1 | canvas, gutter, radii | token values | shipped |
| 2 | reveal the sidebar card | paint order in one column | shipped |
| 3 | card the conversation column, recess the composer | paint order in a second column + a nested surface | shipped |
| 4 | move the plugin's rows to their own Settings tab | the `settings.section` slot tree, not CSS | **shipped** |

**Rules for every pass.**

1. One mechanism per pass. Do not mix a token change with a layout change.
2. Build, `node --check`, `node verify.mjs` before starting the browser.
3. Verify in **both** themes, and for surface work **read the render's pixels**,
   not only computed style — computed style said the card was correct for two
   sessions while it was covered (L18).
4. Tear the rig down and confirm the `web` profile is byte-identical.
5. Record the pass in `decision.md`, `architecture.md`, `learning.md` and this
   file before reporting it.

**Pass 3 specifics.** The composer needs a recessed tone: once it sits on the
white card it becomes invisible (measured contrast 1.0). Canvas tone + 1px edge
gives 1.164 light / 1.453 dark.

**Pass 4 specifics.** Register into `settings.section` and remove the
`settings.general.item` registration in the same change (D25). Re-check the
Settings board CSS afterwards, because the rows will live under a new section
anchor.
