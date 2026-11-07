// Pre-install checks. A bundle whose host half fails to import takes the whole
// application's boot down ("web boot: 1 entry did not activate"), so every
// check here exists to catch a defect before installation rather than after.
// Run: node verify.mjs
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const failures = [];
const checks = [];

function check(name, fn) {
  // Each check runs in isolation and may be async (host import). A throw inside
  // a check must become a reported failure, never an unhandled rejection that
  // takes this script down — the script is the thing meant to catch that class
  // of defect.
  checks.push({ name, fn });
}

async function runAll() {
  const results = [];
  for (const { name, fn } of checks) {
    try {
      results.push({ name, ok: true, detail: await fn() });
    } catch (error) {
      results.push({ name, ok: false, error: error.message });
    }
  }
  return results;
}

const manifest = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

check('manifest: bundle patch declared', () => {
  if (!manifest.dsh?.bundle?.patch) throw new Error('dsh.bundle.patch missing');
  return manifest.dsh.bundle.patch;
});

check('manifest: client platform is web', () => {
  const platform = manifest.dsh?.client?.platform;
  if (platform !== 'web') throw new Error(`expected web, got ${platform}`);
  return platform;
});

check('manifest: every declared file exists', () => {
  const missing = [];
  for (const entry of manifest.files ?? []) {
    if (entry.includes('*')) continue;
    if (!existsSync(resolve(root, entry))) missing.push(entry);
  }
  if (missing.length > 0) throw new Error(`missing: ${missing.join(', ')}`);
  return `${(manifest.files ?? []).length} entries`;
});

check('manifest: exports resolve to real files', () => {
  const bad = [];
  for (const [key, target] of Object.entries(manifest.exports ?? {})) {
    if (target.includes('*')) continue;
    if (!existsSync(resolve(root, target))) bad.push(`${key} -> ${target}`);
  }
  if (bad.length > 0) throw new Error(`unresolved: ${bad.join(', ')}`);
  return `${Object.keys(manifest.exports ?? {}).length} exports`;
});

check('manifest: main declared (loader resolves the host half by it)', () => {
  if (!manifest.main) throw new Error('main is missing');
  if (!existsSync(resolve(root, manifest.main))) throw new Error(`main points at a missing file: ${manifest.main}`);
  return manifest.main;
});

check('host half: imports without throwing', async () => {
  const module = await import(pathToFileURL(join(root, 'index.js')).href + `?t=${Date.now()}`);
  const plugin = module.default;
  if (!plugin || typeof plugin.apply !== 'function') {
    throw new Error('default export must expose apply()');
  }
  // Activation must be safe: calling it must not throw or register anything.
  plugin.apply({}, {});
  return 'default export with apply()';
});

check('client bundle: parses and registers a factory', () => {
  const source = readFileSync(join(root, 'client.js'), 'utf8');
  if (!source.includes('__ModuleLoader__.load')) throw new Error('bundle does not call __ModuleLoader__.load');
  // Parse only: evaluating it needs the browser, which this check must not fake.
  new Function(source);
  return `${source.length} bytes`;
});

check('client bundle: id matches the package name', () => {
  const source = readFileSync(join(root, 'client.js'), 'utf8');
  const match = /id:\s*['"]([^'"]+)['"]/.exec(source);
  if (!match) throw new Error('no module id found');
  if (match[1] !== manifest.name) throw new Error(`id "${match[1]}" != package name "${manifest.name}"`);
  return match[1];
});

check('patch: inserts exactly the declared row', () => {
  const text = readFileSync(join(root, manifest.dsh.bundle.patch), 'utf8');
  const ids = [...text.matchAll(/^\s*-\s*id:\s*(\S+)/gm)].map((m) => m[1]);
  if (ids.length !== 1) throw new Error(`expected one row, found ${ids.length}`);
  return ids[0];
});

check('client bundle: every CSS block is complete (backtick hazard)', () => {
  // The CSS lives in template literals. A backtick inside a CSS comment closes the
  // literal early, and the damage is subtle: the result is often still VALID
  // JavaScript — the remainder becomes an identifier expression and the next
  // backtick swallows the following code as a fresh literal. So the bundle parses
  // and the stylesheet is silently truncated. That is checked here, on the built
  // output, by requiring every *_CSS literal to have balanced braces and to end on
  // a closing rule.
  const source = readFileSync(join(root, 'client.js'), 'utf8');
  const problems = [];
  let found = 0;
  for (const match of source.matchAll(/const\s+\w*_?CSS\w*\s*=\s*`/g)) {
    const start = match.index + match[0].length;
    let end = start;
    while (end < source.length && source[end] !== '`') {
      if (source[end] === '\\') end += 2;
      else end += 1;
    }
    const literal = source.slice(start, end);
    found += 1;
    const opens = (literal.match(/\{/g) ?? []).length;
    const closes = (literal.match(/\}/g) ?? []).length;
    if (opens !== closes) {
      const at = source.slice(0, start).split('\n').length;
      problems.push(`literal at line ${at}: ${opens} { vs ${closes} } (truncated?)`);
    } else if (!/\}\s*$/.test(literal.trim())) {
      const at = source.slice(0, start).split('\n').length;
      problems.push(`literal at line ${at}: does not end on a closing rule`);
    }
  }
  if (found === 0) throw new Error('no CSS literals found — the check is not looking at the bundle');
  if (problems.length > 0) throw new Error(problems.join('; '));
  return `${found} CSS blocks balanced`;
});

check('source: no backtick inside a CSS comment', () => {
  // The cause of the truncation above. A CSS comment is a /* */ block that is not
  // JSDoc (/** */): backticks in JSDoc are legal JS and are deliberately excluded,
  // because those blocks document functions and host tokens.
  const offenders = [];
  for (const name of readdirSync(join(root, 'src')).filter((f) => f.endsWith('.js'))) {
    const text = readFileSync(join(root, 'src', name), 'utf8');
    for (const match of text.matchAll(/\/\*([\s\S]*?)\*\//g)) {
      if (match[0].startsWith('/**')) continue;
      if (match[1].includes('`')) {
        const line = text.slice(0, match.index).split('\n').length;
        offenders.push(`${name}:${line}`);
      }
    }
  }
  if (offenders.length > 0) throw new Error(`backtick in CSS comment at ${offenders.join(', ')}`);
  return 'none';
});

check('source: no backtick inside a CSS template literal at all', () => {
  // The check above only looks inside /* */ comments. It misses the same bug in ordinary CSS
  // CONTENT, and that is not hypothetical: a backtick written into a CSS comment that had
  // already been converted to single quotes - "fading the card token to the `transparent`
  // keyword" - sat inside a declaration block, terminated the template literal, and every gate
  // passed. The bundle still parsed, because the remainder read as an identifier expression,
  // and the stylesheet was silently truncated.
  //
  // The direct test is a brace/paren balance one on the CSS that ACTUALLY reaches the page, so
  // the check reads the BUILT bundle rather than the sources: concatenate what each literal
  // produced and verify every block closes. A literal cut short leaves an unterminated rule.
  //
  // Implementation: take each `const NAME_CSS = ...` region out of the SOURCE and require that
  // the region between the opening backtick and the first following backtick is followed by a
  // semicolon - i.e. the opening quote closed on the assignment, not somewhere in the middle.
  const offenders = [];
  for (const name of readdirSync(join(root, 'src')).filter((f) => f.endsWith('.js')).sort()) {
    const text = readFileSync(join(root, 'src', name), 'utf8');
    const openRe = /(?:const|let|var)\s+\w*_CSS\s*=\s*`/g;
    for (const open of text.matchAll(openRe)) {
      const startLine = text.slice(0, open.index).split('\n').length;
      const bodyStart = open.index + open[0].length;
      const close = text.indexOf('`', bodyStart);
      if (close === -1) {
        offenders.push(`${name}:${startLine}: literal never closes`);
        continue;
      }
      // the character(s) right after the closing backtick must be the statement end
      const tail = text.slice(close + 1, close + 3);
      if (!/^\s*;/.test(tail)) {
        offenders.push(`${name}:${startLine}: closes mid-statement, before ${JSON.stringify(text.slice(close + 1, close + 40).trim().slice(0, 30))}`);
      }
    }
  }
  if (offenders.length > 0) {
    throw new Error(
      'a CSS template literal is terminated early by a stray backtick —\n    ' +
        offenders.join('\n    ') +
        '\n    Use quotes inside CSS comments and content; a backtick closes the literal.',
    );
  }
  return 'every CSS literal closes on its own statement';
});

check('source: every fragment compiles on its own', () => {
  // The strongest available check on the backtick hazard, and the one the earlier
  // checks could not give: parse each fragment AS SOURCE instead of reasoning about
  // its characters.
  //
  // A fragment is not a module (it relies on the envelope in 00-prelude and on
  // identifiers declared by its siblings), so it cannot be imported or evaluated.
  // It can still be *parsed*, which is exactly the failure mode that keeps recurring:
  // a backtick inside a CSS comment closes the template literal early, and the result
  // is usually still valid JavaScript — the remainder parses as an identifier
  // expression — so `node --check` on the built bundle and a brace-balance heuristic
  // both pass while the stylesheet is silently truncated.
  //
  // This has now happened five times (15-tokens twice, 40-feature-sidebar,
  // 47-feature-center, 60-settings, and again in 15-tokens while adding the
  // forced-colors block). Each was caught, but each cost a build cycle. Parsing the
  // source catches it at the declaration, with the fragment named.
  // Two fragments are delimiters and CANNOT parse alone by construction: 00-prelude
  // opens the `__ModuleLoader__.load({...})` call and 99-footer closes it. Everything
  // between them is a statement list and must parse.
  const DELIMITERS = new Set(['00-prelude.js', '99-footer.js']);
  const offenders = [];
  const files = readdirSync(join(root, 'src')).filter((f) => f.endsWith('.js')).sort();
  for (const name of files) {
    if (DELIMITERS.has(name)) continue;
    const text = readFileSync(join(root, 'src', name), 'utf8');
    // A fragment is a statement list inside a larger function body; wrapping it in a
    // no-op function gives a valid parse target without executing anything.
    try {
      new Function('require', text);
    } catch (error) {
      offenders.push(`${name}: ${error.message}`);
    }
  }
  if (offenders.length > 0) throw new Error('fragment does not parse —\n    ' + offenders.join('\n    '));
  return files.length - DELIMITERS.size + ' fragments parse (2 delimiters excluded)';
});

check('fragments: no MODULE-scope identifier read before its declaring fragment', () => {
  // Fragments are concatenated in filename order and share one scope, so a const is
  // only initialised once its own fragment runs. A feature builds its CSS string at
  // module scope, so reading a later fragment's const there throws
  // "Cannot access 'X' before initialization" during import — which takes the whole
  // plugin's activation down. Found in pass 4 with ROW_ATTR.
  //
  // Only MODULE-scope declarations count. The fragments are indented four spaces
  // inside the factory, so a module-scope const sits at exactly four spaces while
  // function-local ones sit deeper. Matching locals instead produced twelve false
  // positives (frame, roles, title, ...) on a clean tree.
  const files = readdirSync(join(root, 'src')).filter((f) => f.endsWith('.js')).sort();

  const declaredIn = new Map();
  for (const name of files) {
    const src = readFileSync(join(root, 'src', name), 'utf8');
    for (const m of src.matchAll(/^ {4}(?:const|let)\s+([A-Za-z_$][\w$]*)/gm)) {
      if (!declaredIn.has(m[1])) declaredIn.set(m[1], name);
    }
  }

  const problems = [];
  for (const name of files) {
    const src = readFileSync(join(root, 'src', name), 'utf8');
    for (const [ident, firstDecl] of declaredIn) {
      if (firstDecl <= name) continue; // declared here or earlier: fine
      const re = new RegExp('(^|[^\\w$.])' + ident.replace(/\$/g, '\\$') + '($|[^\\w$])');
      if (re.test(src)) problems.push(name + ' reads ' + ident + ' (declared in ' + firstDecl + ')');
    }
  }

  if (problems.length > 0) throw new Error(problems.join('; '));
  return files.length + ' fragments, ' + declaredIn.size + ' module-scope declarations';
});

check('icon: 36x36 package mark, decorative, exportable', () => {
  // The icon is the one UI artefact this theme owns, and it is a PACKAGE icon — a
  // different artefact from the 16px in-UI glyph grid (D49). The convention is not
  // invented: every package icon on the host's Plugins page is
  //   width=36 height=36 viewBox="0 0 36 36" fill=none
  // with an outline glyph in a cyan->blue gradient. A previous version was a 32px
  // solid four-shape mark in a flat literal colour, which matched nothing.
  const iconPath = resolve(root, manifest.exports?.['./icon'] ?? 'icon.svg');
  if (!existsSync(iconPath)) throw new Error(`icon missing at ${iconPath}`);
  const svg = readFileSync(iconPath, 'utf8');

  const problems = [];
  if (!/viewBox="0 0 36 36"/.test(svg)) problems.push('viewBox is not "0 0 36 36"');
  if (!/width="36"/.test(svg) || !/height="36"/.test(svg)) problems.push('not declared 36x36');
  if (!/fill="none"/.test(svg)) problems.push('root is not fill="none" (outline icon)');
  // Decorative: the host wraps every package icon in aria-hidden, so the row title is
  // the accessible name. Claiming role="img" would assert semantics it never carries.
  if (!/role="presentation"/.test(svg)) problems.push('not role="presentation"');
  if (!/aria-hidden="true"/.test(svg)) problems.push('not aria-hidden');
  if (/aria-label=/.test(svg)) problems.push('has an aria-label, which cannot be localised in a static file');
  // Artwork may use a gradient — the host's own package icons do, identically in both
  // themes — but it must actually use one, not merely declare one.
  //
  // Comments are stripped first. A naive string test passed a planted violation whose
  // gradient was inside an HTML comment: the text was still there, the paint was gone.
  const uncommented = svg.replace(/<!--[\s\S]*?-->/g, '');
  if (!/<linearGradient/.test(uncommented)) problems.push('no gradient (the package set uses one)');
  if (!/(stroke|fill)="url\(#/.test(uncommented)) problems.push('gradient declared but not used by any shape');
  // Must be well-formed enough to be an image.
  if (!/<\/svg>\s*$/.test(svg.trim())) problems.push('does not close');

  if (problems.length > 0) throw new Error(problems.join('; '));
  return '36x36 outline, presentation, gradient';
});

check('source: no position on a HOST descendant (layout contract)', () => {
  // The right panel's root is `position: absolute` with all four insets set by the host
  // (`.P3OORG_panel`). Its HEIGHT comes from being edge-anchored. Declaring
  // `position: relative` over it silently detaches it: it stops being edge-anchored,
  // has no height of its own, and collapses to content.
  //
  // That shipped. Measured: panel 900px -> 288px, and because every wrapper in the pane
  // is `overflow: hidden`, everything below the fold became unreachable. The user's
  // report was "no scrolling in the right panel"; the cause was a collapsed box.
  //
  // SCOPE, because the first version of this check flagged 10 legitimate declarations:
  //
  //   ours   `[data-dsh-bento-part="x"]`  the column wrappers the kernel stamps, and
  //          `::after` on them — positioning these is how the card technique works.
  //   theirs anything reached THROUGH a host anchor: `[data-slot] >`, `> * > *`,
  //          `[data-shortcut-modal] > div`, or a host class fragment.
  //
  // So the rule is: never declare `position` on an element the host owns, because the
  // host may be deriving its size from that position. Paint is ours; layout is theirs.
  const offenders = [];
  // A selector is "host-owned" when it descends through a HOST anchor — a slot anchor, a
  // settings-modal child, or a host class fragment. Reaching into our own column's
  // children (`[part="center"] > * > *`) is still ours: the kernel stamped that column,
  // and its children are the host's CONTENT, which we are allowed to lift.
  //
  // THE (?!nav) EXCLUSION WAS DEAD CODE, and it was found by the gate firing on a nav rule
  // that was legitimate. `\s*` is greedy but can match ZERO characters, so on the string
  // " > nav" the engine takes no spaces and runs the lookahead at offset 0 — where the next
  // character is a space, not "nav", so the exclusion never applies. Demonstrated directly:
  // / >\s*(?!nav)/ matches ">" at index 0 of " > nav " and its lookahead sees " ".
  //
  // The exclusion is gone rather than repaired with a lookahead that skips whitespace,
  // because excluding one tag name was the wrong shape anyway: `> div` is exactly as
  // host-owned as `> nav`. What is genuinely safe is narrower, and is stated below.
  const HOST_OWNED = /\[data-slot\]\s*>|\[data-shortcut-modal[^\]]*\]\s*>|\[class\*="/;

  // VERIFIED SAFE EXEMPTION 1. The Settings content column is `position: static` in the
  // host (measured with the theme off), so `position: relative` on it does not detach
  // anything — it only makes the column the containing block for the card painted on
  // its ::before. Measured both states: content 612x800, fills the panel, the real
  // scroller still `overflowY: auto` and scrolls. Declared here rather than special-cased
  // silently, so the next reader knows it was checked.
  const SAFE = /\[data-shortcut-modal="settings"\] > div:has\(\[data-slot="settings\.section"\]\)/;

  // VERIFIED SAFE EXEMPTION 2: OUR OWN PSEUDO-ELEMENTS.
  //
  // The card technique paints on a ::before/::after that we create. Declaring
  // `position: absolute` on it is the whole mechanism — the pseudo has no box of its own
  // until we give it one, so there is no host-solved size to collapse. The host-owned
  // element underneath is untouched; the rule selects a box that does not exist without
  // this declaration.
  //
  // This is not a hole in the rule: it is the rule's actual boundary. "Never declare
  // position on a host element" means the host's own boxes, and a pseudo-element of ours
  // is not one. The card technique has always depended on this (sidebar ::after, center
  // ::after, rightbar ::after), and the check only missed it because those selectors
  // reach through `[data-dsh-bento-part]`, which HOST_OWNED does not match.
  const OUR_PSEUDO = /::(before|after)\s*\{?\s*$/;

  // Each exemption must also stay narrow: SAFE is one exact selector, and OUR_PSEUDO
  // requires the position declaration to be inside a ::before/::after rule, so it cannot
  // excuse a position on the host element itself.

  for (const name of readdirSync(join(root, 'src')).filter((f) => f.endsWith('.js')).sort()) {
    const lines = readFileSync(join(root, 'src', name), 'utf8').split('\n');
    // Track the rule properly: open on a line ending with `{`, close on `}`.
    //
    // THE CLOSE CONDITION BIT TWICE, and the second time was worse. First it never reset at
    // all, so six legitimate declarations were flagged. The fix then matched only a BARE
    // `}` — but the last CSS block in every fragment ends its file as `});` (the
    // FEATURES.push call), which is not bare, so `depth` never returned to 0 and `current`
    // stayed on the previous selector. A `position:` declaration added after the closing
    // rule was therefore attributed to `FEATURES.push({`, which HOST_OWNED does not match,
    // and a real violation passed silently. Found by planting one and watching it survive.
    //
    // The counter now tracks nesting depth so a `}` on any line closes the innermost rule.
    let current = null;
    let depth = 0;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (depth === 0 && /\{\s*$/.test(line) && !/^[a-z-]+\s*:/.test(trimmed)) {
        current = trimmed;
        depth = 1;
        continue;
      }
      if (depth > 0) {
        // A closing brace on any line ends the innermost rule. Testing only for a bare
        // `}` is what let the final `});` of a fragment keep the previous selector live.
        if (/\}/.test(trimmed)) { depth = 0; current = null; continue; }
        if (!/^position:\s*(relative|absolute|fixed);/.test(trimmed)) continue;
        if (!current) continue;
        if (SAFE.test(current)) continue;
        // A pseudo-element we create has no host-solved box to collapse.
        if (OUR_PSEUDO.test(current)) continue;
        if (!HOST_OWNED.test(current)) continue;
        offenders.push(`${name}:${i + 1}: ${trimmed}  [${current.slice(0, 70)}]`);
      }
    }
  }

  if (offenders.length > 0) {
    throw new Error(
      'declaring position on a host element can collapse it —\n    ' +
        offenders.join('\n    ') +
        '\n    Paint is ours; layout is theirs.',
    );
  }
  return 'no feature repositions a host-owned element';
});

check('locales: en and zh present with meta', () => {
  const langs = [];
  for (const lang of ['en', 'zh']) {
    const path = join(root, 'locale', `${lang}.json`);
    if (!existsSync(path)) throw new Error(`locale/${lang}.json missing`);
    const dict = JSON.parse(readFileSync(path, 'utf8'));
    if (!dict.meta?.title) throw new Error(`locale/${lang}.json has no meta.title`);
    langs.push(lang);
  }
  return langs.join(', ');
});

check('source: no transition hardcodes a duration (reduced motion)', () => {
  // A transition written as a literal duration is invisible to
  // `prefers-reduced-motion`: a media query in the stylesheet cannot reach an inline
  // style, and a literal in a style object is inline by definition.
  //
  // That is not hypothetical. The plugin's own Settings switch shipped with
  // `transition: 'background-color 160ms ...'` while the token layer set
  // --dsh-bento-motion to 0ms, so every stylesheet rule honoured the preference and
  // the one control the rule was written for kept animating (measured 16px -> 9.378px
  // -> 0px under `reduce`). The audit found it; this check stops it coming back.
  //
  // The rule: every transition duration must come from the motion token
  // (`var(--dsh-bento-motion, ...)`) or from a value that already resolved the
  // preference. `transition: none` is fine — it declares no duration.
  const offenders = [];
  for (const name of readdirSync(join(root, 'src')).filter((f) => f.endsWith('.js')).sort()) {
    const text = readFileSync(join(root, 'src', name), 'utf8');
    const lines = text.split('\n');
    lines.forEach((line, index) => {
      const at = line.indexOf('transition');
      if (at === -1) return;
      // A duration literal: 160ms, 0.16s, 1s. Not a var() reference.
      if (!/\b\d+(?:\.\d+)?m?s\b/.test(line)) return;
      if (line.includes('var(--dsh-bento-motion')) return;
      offenders.push(`${name}:${index + 1}: ${line.trim().slice(0, 70)}`);
    });
  }
  if (offenders.length > 0) {
    throw new Error('literal duration ignores the motion token —\n    ' + offenders.join('\n    '));
  }
  return 'every duration resolves through --dsh-bento-motion';
});

check('source: no hardcoded colour (every shade is a host token)', () => {
  // The plugin's stated rule is "only --dsw-alias-* host tokens for colour, so light,
  // dark and any registered theme follow automatically". It had exactly one exception:
  // the Settings switch knob carried `box-shadow: 0 1px 2px rgba(0, 0, 0, 0.3)`, and
  // the host's own knob has no shadow at all — so the literal was inventing depth the
  // design does not have. Found by the P2 audit, removed.
  //
  // Comments are stripped before scanning, because the token layer documents the
  // resolved values of host aliases (#ebeef2, #fff, ...) and those are documentation,
  // not declarations. Only declarations count.
  //
  // Artwork is exempt: icon.svg is not read here, and any future generated asset gets
  // its own path exclusion rather than a blanket allow.
  //
  // src/14-fontdata.js is generated base64 and is excluded BY NAME rather than by
  // directory, because it is not artwork and the rule that governs it is different: its
  // bytes must match assets/*.woff2 exactly, which the fontdata gate below enforces. It
  // needs the exclusion because base64 uses every letter this scan looks for — the word
  // "black" can appear in a 64 KB font by chance, so without the exclusion this gate
  // would one day fail on a byte that is not a colour at all.
  const GENERATED_FONT_DATA = '14-fontdata.js';
  // src/16-palette.js is the ONE place literals are allowed, and for a specific reason: a
  // palette is data the user picks from, not a surface that should follow the theme. The rule
  // this gate enforces exists so painted surfaces track light/dark automatically; an accent the
  // user chose is the opposite of that - it is meant to be a fixed, named value. The exemption
  // is by filename, and the palette gate below takes over responsibility for it: every accent
  // must still clear AA once the theme derives its tint and ink, so the file is not unguarded,
  // it is guarded by a check that understands what it is.
  const PALETTE = '16-palette.js';
  const offenders = [];
  for (const name of readdirSync(join(root, 'src')).filter((f) => f.endsWith('.js')).sort()) {
    if (name === GENERATED_FONT_DATA) continue;
    if (name === PALETTE) continue;
    const raw = readFileSync(join(root, 'src', name), 'utf8');
    // blank out comments but keep line numbers stable
    const text = raw.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
    text.split('\n').forEach((line, index) => {
      const code = line.replace(/\/\/.*$/, '');
      const hex = code.match(/#[0-9a-fA-F]{3,8}\b/);
      const rgb = code.match(/\brgba?\(/);
      const named = code.match(/(?<![\w-])(white|black|red|blue|green|gray|grey)(?![\w-])/);
      if (hex || rgb || named) {
        offenders.push(`${name}:${index + 1}: ${(hex || rgb || named)[0]}`);
      }
    });
  }
  if (offenders.length > 0) {
    throw new Error('literal colour, use a --dsw-* token —\n    ' + offenders.join('\n    '));
  }
  return 'every colour resolves through a host token';
});

check('source: no box-shadow unless it resolves through a token', () => {
  // A hardcoded shadow is worse than a hardcoded colour, because it fails differently
  // in each theme: a black shadow that reads correctly on white is invisible on a dark
  // surface, and the card appears to lose its lift rather than its colour. The theme's
  // own shadow is derived from --dsw-alias-label-primary, so it is correct in both
  // themes from one declaration (D57).
  //
  // Permitted: `var(--dsh-bento-…)`, `none`, `inherit`. Everything else is a literal
  // shadow that will not follow the theme.
  const offenders = [];
  for (const name of readdirSync(join(root, 'src')).filter((f) => f.endsWith('.js')).sort()) {
    const raw = readFileSync(join(root, 'src', name), 'utf8');
    const text = raw.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
    text.split('\n').forEach((line, index) => {
      const code = line.replace(/\/\/.*$/, '');
      const m = code.match(/box-shadow:\s*([^;]+);/);
      if (!m) return;
      const value = m[1].trim();
      if (value === 'none' || value === 'inherit') return;
      if (/var\(--dsh-bento-[a-z-]+\)/.test(value) && !/\brgba?\(|#[0-9a-fA-F]{3,8}\b/.test(value)) return;
      offenders.push(`${name}:${index + 1}: ${value.slice(0, 60)}`);
    });
  }
  if (offenders.length > 0) {
    throw new Error('literal shadow, use --dsh-bento-shadow —\n    ' + offenders.join('\n    '));
  }
  return 'every shadow resolves through --dsh-bento-shadow';
});

check('fonts: embedded bytes match the assets they were generated from', () => {
  // The font data is generated from assets/*.woff2 by tools/make-fontdata.mjs. Nothing
  // else in the build notices if the two drift: client.js would keep shipping whichever
  // font it was last generated with, and a refreshed asset would silently never reach the
  // page. This is the same hazard as any committed generated file, and the same fix —
  // compare the artefact to its source, so drift fails loudly here instead of surviving
  // as a stale glyph shape nobody can attribute to anything.
  const generated = readFileSync(join(root, 'src', '14-fontdata.js'), 'utf8');
  const expected = [
    ['FONT_INTER_WOFF2', 'inter-latin.woff2'],
    ['FONT_MONO_WOFF2', 'jetbrains-mono-latin.woff2'],
  ];
  for (const [name, file] of expected) {
    const actual = readFileSync(join(root, 'assets', file)).toString('base64');
    if (!generated.includes(`const ${name} = '${actual}';`)) {
      throw new Error(`${name} does not match assets/${file} — run node tools/make-fontdata.mjs`);
    }
    // A base64 blob can be "present" and still be the wrong font; the magic bytes of a
    // WOFF2 start with "wOF2", so decode four bytes and check the container is real.
    const decoded = Buffer.from(actual.slice(0, 8), 'base64').toString('latin1');
    if (!decoded.startsWith('wOF2')) {
      throw new Error(`assets/${file} is not a WOFF2 font (starts ${JSON.stringify(decoded.slice(0, 4))})`);
    }
  }
  return 'both embedded faces match their source files and carry the wOF2 header';
});

check('palette: every accent stays readable once the theme derives its tint and ink', () => {
  // The palette is exempt from the "no hardcoded colour" gate, so this check has to do the
  // work that gate does elsewhere: prove the values are usable rather than merely present.
  //
  // It recomputes exactly what the theme will produce from each accent - the selection fill is
  // the accent mixed 12% into the card, the ink is the accent mixed 65% toward the label
  // colour (D55) - and asserts WCAG AA for the ink and 3:1 for the accent used as an icon.
  //
  // This is the check that would have caught the first attempt at this feature: a hand-written
  // per-accent ink table looked reasonable and measured 1.20:1 for amber in dark. Deriving the
  // ink and asserting the derivation is what makes a ninth accent a safe thing to add.
  const src = readFileSync(join(root, 'src', '16-palette.js'), 'utf8');
  const entries = [...src.matchAll(
    /\{\s*id:\s*'([a-z]+)',\s*label:\s*\{[^}]*\},\s*light:\s*'(#[0-9a-fA-F]{6})',\s*dark:\s*'(#[0-9a-fA-F]{6})'\s*\}/g,
  )];
  if (entries.length < 2) throw new Error(`expected at least 2 accents, parsed ${entries.length}`);

  const hex2rgb = (h) => { const s = h.slice(1); return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)]; };
  const rgb2hex = (r) => '#' + r.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
  const mix = (a, b, p) => { const A = hex2rgb(a), B = hex2rgb(b); return rgb2hex([0, 1, 2].map((i) => A[i] * p + B[i] * (1 - p))); };
  const lin = (v) => { v /= 255; return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const lum = (h) => { const [r, g, b] = hex2rgb(h); return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b); };
  const contrast = (a, b) => { const x = lum(a), y = lum(b); return Math.round(((Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)) * 100) / 100; };

  const CARD_LIGHT = '#ffffff';
  const CARD_DARK = '#2c2c2e';
  const LABEL_LIGHT = '#0f1115';
  const LABEL_DARK = '#f5f6f7';
  const failures = [];
  let worstInk = Infinity;
  let worstIcon = Infinity;

  for (const [, id, light, dark] of entries) {
    for (const [theme, accent, card, label] of [
      ['light', light, CARD_LIGHT, LABEL_LIGHT],
      ['dark', dark, CARD_DARK, LABEL_DARK],
    ]) {
      const tint = mix(accent, card, 0.12);
      const ink = mix(accent, label, 0.65);
      const inkC = contrast(ink, tint);
      const iconC = contrast(accent, card);
      worstInk = Math.min(worstInk, inkC);
      worstIcon = Math.min(worstIcon, iconC);
      if (inkC < 4.5) failures.push(`${id}/${theme}: derived ink ${inkC}:1 on tint ${tint} (AA needs 4.5)`);
      if (iconC < 3) failures.push(`${id}/${theme}: accent as icon ${iconC}:1 on card ${card} (needs 3)`);
    }
  }
  if (failures.length > 0) throw new Error('palette is not readable —\n    ' + failures.join('\n    '));
  return `${entries.length} accents, worst ink ${worstInk}:1, worst icon ${worstIcon}:1`;
});

check('fonts: the OFL licence travels with the embedded bytes', () => {
  // OFL 1.1 condition 2: redistributing a font inside another bundle requires that each
  // copy carry the copyright notice AND the licence. The bytes here live in client.js, so
  // the package itself is the "copy" — if THIRD_PARTY_NOTICES.md is not in `files`, an
  // installed plugin ships two fonts and no licence, which is a licence violation that no
  // other check would notice. Condition 3 is why the runtime family names are ours
  // ('Bento Inter', not 'Inter'): a modified or renamed build may not use the reserved name.
  const files = manifest.files ?? [];
  if (!files.includes('THIRD_PARTY_NOTICES.md')) {
    throw new Error('THIRD_PARTY_NOTICES.md is not shipped — the OFL requires the licence to travel with the font');
  }
  const notices = readFileSync(join(root, 'THIRD_PARTY_NOTICES.md'), 'utf8');
  for (const [name, marker] of [['Inter', 'The Inter Project Authors'], ['JetBrains Mono', 'The JetBrains Mono Project Authors']]) {
    if (!notices.includes(marker)) throw new Error(`${name} attribution missing from THIRD_PARTY_NOTICES.md`);
  }
  if (!/SIL OPEN FONT LICENSE Version 1\.1/.test(notices)) {
    throw new Error('the OFL 1.1 text is missing from THIRD_PARTY_NOTICES.md');
  }
  return 'both faces attributed, OFL 1.1 text present, notice file shipped';
});

check('fonts: the embedded faces are actually referenced by the stylesheet', () => {
  // A @font-face with no consumer is dead weight: 88 KB shipped, nothing rendered. This
  // caught nothing on the day it was written — the rule is written because the font is
  // large enough that a future edit which drops the token override would cost 88 KB of
  // dead payload with no visible symptom except "the font we shipped is not being used".
  const raw = readFileSync(join(root, 'src', '54-feature-font.js'), 'utf8');
  // Anchored on a non-hyphen so `--dsw-font-family:` is not counted as a `font-family:`
  // declaration. The first version of this check lacked the boundary and reported three
  // faces for two, which is the check being wrong rather than the stylesheet.
  const declared = [...raw.matchAll(/(?<![\w-])font-family:\s*'([^']+)'/g)].map((m) => m[1]);
  if (declared.length !== 2) {
    throw new Error(`expected 2 declared faces (UI + mono), found ${declared.length}`);
  }
  // the family names must appear again in the token overrides, not only in the face
  for (const family of declared) {
    const uses = raw.split(`'${family}'`).length - 1;
    if (uses < 2) throw new Error(`'${family}' is declared but never applied to a token`);
  }
  return `${declared.join(' + ')} declared and applied`;
});

check('fonts: the override reaches the token chain, not just one property', () => {
  // The measured fact this pins: the host's 62 composite font tokens are DERIVED from
  // --dsw-font-family, so overriding that one token re-fonts markdown, headings, labels
  // and the rest. If the host ever inlines families into those tokens instead, the font
  // feature becomes silently partial — body copy changes and prose does not — and the
  // symptom ("the font did not apply everywhere") looks like a specificity bug rather
  // than a contract change. So the contract is asserted here.
  const raw = readFileSync(join(root, 'src', '54-feature-font.js'), 'utf8');
  if (!/--dsw-font-family:/.test(raw)) {
    throw new Error('the root UI family token is not overridden');
  }
  if (!/--ds-font-family-code:/.test(raw)) {
    throw new Error('the code family token is not overridden, so the pairing is only half delivered');
  }
  // The mono chain hangs off its own token, so assert both were named rather than assumed.
  return 'UI family and code family are both redirected';
});

check('spacing: the cell inset separates from the gutter and clears the card radius', () => {
  // The measured defect this pins (D68): the settings row rule used the GUTTER for both jobs —
  // `margin-inline: -gutter` (how far the hover fill bleeds) and `padding-inline: gutter` (where
  // the text starts). With one number doing both, the text sat 12px inside a card whose corner
  // radius is 16px, so the first glyph of every label began INSIDE the arc. That is invisible to
  // the two gates that already exist: the colour gate sees a token, the position gate sees no
  // `position`, and both are satisfied by the broken rule.
  //
  // Three invariants, each of which a future "tidy-up" could break silently:
  //   1. the row's padding-inline resolves through the cell inset, not the gutter
  //   2. the cell inset is >= the nested radius (content clears the arc)
  //   3. the fill still bleeds to the card edge (margin stays on the gutter)
  const tokens = readFileSync(join(root, 'src', '15-tokens.js'), 'utf8');
  const settings = readFileSync(join(root, 'src', '50-feature-settings.js'), 'utf8');

  const insetMatch = /--dsh-bento-cell-inset:\s*(\d+)px/.exec(tokens);
  if (!insetMatch) throw new Error('--dsh-bento-cell-inset is not declared (the inset is back to sharing the gutter)');
  const cellInset = Number(insetMatch[1]);
  const nested = Number((/--dsh-bento-radius-nested:\s*(\d+)px/.exec(tokens) || [])[1]);
  if (!Number.isFinite(nested)) throw new Error('--dsh-bento-radius-nested is not declared');
  if (cellInset < nested) {
    throw new Error(
      `cell inset ${cellInset}px is below the nested radius ${nested}px, so content starts inside the corner arc`,
    );
  }

  // The settings row rule must use the inset for padding and the gutter for margin. Searching the
  // whole rule body rather than one line, because a formatter could reorder the declarations.
  //
  // THE SOURCE IS NORMALISED FIRST. These selectors are built as JS template literals, so the
  // literal text contains `${ROOT_ATTR}` and `${ROW_ATTR}` — and the `{` inside an interpolation
  // is indistinguishable from a rule's opening brace to a naive regex. The first version of this
  // check matched `${ROOT_ATTR}` as the block opener, captured "ROOT_ATTR}" as the body, and FAILED
  // ON CORRECT CODE. Collapsing every interpolation to a placeholder first makes the brace
  // structure of the CSS the only braces the regex can see.
  const flat = settings.replace(/\$\{[^}]*\}/g, 'X');
  const rowRule = /\[data-slot="settings\.general\.item"\] > \*:has\(\*\),[\s\S]{0,400}?\{([\s\S]*?)\n\}/.exec(flat);
  if (!rowRule) throw new Error('the settings row rule could not be located, so this contract is unverified');
  const body = rowRule[1];
  if (!/padding-inline:\s*var\(--dsh-bento-cell-inset\)/.test(body)) {
    throw new Error('the row padding-inline does not resolve through the cell inset');
  }
  if (!/margin-inline:\s*calc\(-1 \* var\(--dsh-bento-gutter\)\)/.test(body)) {
    throw new Error('the row margin-inline no longer bleeds the fill to the card edge');
  }

  // The header strip must be compensated for the card inset, and scoped to a direct child —
  // a descendant match also hit a plugin card's inner "headerEnd" on another tab (D68).
  if (!/> \[class\*="header"\]/.test(settings)) {
    throw new Error('the header rule is not scoped to a direct child, so it can pad a plugin card header');
  }
  if (!/padding:\s*calc\(var\(--dsh-bento-gutter\) \+ var\(--dsh-bento-cell-inset\)\)/.test(settings)) {
    throw new Error('the header padding is not compensated for the card inset');
  }

  return `inset ${cellInset}px >= radius ${nested}px; fill bleed intact; header compensated`;
});

check('radii: the card tier is above the inner tier and the pill tier is a token', () => {
  // The card radius moved 20 -> 24 in D69, which is the first time this theme has overridden the
  // host's own top-of-scale value (--dsw-radius-xl is 20). That makes three invariants worth
  // pinning, because each fails silently:
  //
  //   1. card > inner, or every control inside a card is rounder than the card holding it - the
  //      defect D54 fixed in the other direction
  //   2. the nested tier is DERIVED from the 28px host panel, not from our own card, so it must
  //      never be "fixed" to follow the card. When this check was written, 24 - 12 = 12 and the
  //      nested tier is 16; a future reader seeing 12 != 16 could "correct" it and break the
  //      Settings dialog, where the real outer curve is the host's 28.
  //   3. a pill is the largest tier and is tokenised rather than written as 999 at call sites -
  //      the property D45 established for every other radius.
  const tokens = readFileSync(join(root, 'src', '15-tokens.js'), 'utf8');
  const read = (name) => {
    const m = new RegExp(`--dsh-bento-${name}:\\s*(\\d+)px`).exec(tokens);
    return m ? Number(m[1]) : null;
  };
  const card = read('radius');
  const inner = read('radius-inner');
  const nested = read('radius-nested');
  const pill = (() => {
    const m = /--dsh-bento-radius-pill:\s*(\d+)px/.exec(tokens);
    return m ? Number(m[1]) : null;
  })();

  if (card === null) throw new Error('--dsh-bento-radius is not declared');
  if (inner === null) throw new Error('--dsh-bento-radius-inner is not declared');
  if (nested === null) throw new Error('--dsh-bento-radius-nested is not declared');
  if (pill === null) throw new Error('--dsh-bento-radius-pill is not declared (a pill tier was reverted to raw 999)');

  if (inner >= card) {
    throw new Error(`inner tier ${inner}px is not below the card tier ${card}px, so controls out-curve their card`);
  }
  if (pill < card) {
    throw new Error(`pill tier ${pill}px is below the card tier ${card}px, so a pill would not read as a pill`);
  }

  // THE NESTED TIER IS PINNED TO ITS DERIVATION, NOT TO A RANGE. An earlier version of this
  // check only asserted `nested < card`, and a planted "correction" of 16 -> 18 passed it. That
  // is exactly the silent failure this check exists to prevent: 18 is still below 24, so a range
  // test cannot see it, while the Settings dialog's card would no longer be concentric with the
  // 28px host panel it sits in. The value is therefore recomputed from its two inputs.
  const HOST_PANEL = 28; // measured, both themes; the host's Settings dialog radius
  const gutter = Number((/--dsh-bento-gutter:\s*(\d+)px/.exec(tokens) || [])[1]);
  if (!Number.isFinite(gutter)) throw new Error('--dsh-bento-gutter is not declared');
  const expectedNested = HOST_PANEL - gutter;
  if (nested !== expectedNested) {
    throw new Error(
      `nested tier is ${nested}px but ${HOST_PANEL} (host panel) - ${gutter} (gutter) = ${expectedNested}px. ` +
        `It is derived from the HOST panel, not from our own card radius, so it must not follow the card.`,
    );
  }

  // No call site may write a raw radius for the pill; it must come from the token.
  const fragments = readdirSync(join(root, 'src')).filter((f) => f.endsWith('.js') && f !== '16-palette.js');
  for (const f of fragments) {
    const src = readFileSync(join(root, 'src', f), 'utf8');
    // a bare 999 in a border-radius is the signal that the tier was bypassed
    if (/border-radius:\s*999px/.test(src)) {
      throw new Error(`${f} writes border-radius: 999px instead of var(--dsh-bento-radius-pill)`);
    }
  }

  return `card ${card} > inner ${inner}, nested ${nested} (derived from the 28px host panel), pill ${pill}`;
});

check('detail sections: registered into the documented slot, guarded, and null-safe', () => {
  // D70 mounts DOM into a host surface this plugin does not own, which is a new kind of claim for
  // this bundle (every other feature is CSS). Three invariants make it survivable:
  //
  //   1. it registers into the slot the client runner's own contract catalog documents, using the
  //      documented shape ({ name, id, order, label } + component)
  //   2. it lives behind its own try/catch in apply(), LAST, so a host contract change costs a
  //      section and not the theme's whole stylesheet
  //   3. every component returns null for a subject it does not understand - the contract says so
  //      explicitly ("renders null for a subject it has nothing for"), and a component that throws
  //      on an unexpected subject would take the host's detail page down with it
  const sections = readFileSync(join(root, 'src', '61-detail-sections.js'), 'utf8');
  const footer = readFileSync(join(root, 'src', '99-footer.js'), 'utf8');

  if (!/ctx\.slots\.inject\('plugins\.detail\.section'/.test(sections)) {
    throw new Error("never injects 'plugins.detail.section' - the section will not mount");
  }
  if (!/name: 'plugins\.detail\.section'/.test(sections)) {
    throw new Error('registers without the documented slot name, so the host cannot dispatch to it');
  }
  if (!/id: 'bento-facts'/.test(sections) || !/id: 'bento-board'/.test(sections)) {
    throw new Error('a section registration is missing its id');
  }
  if (!/order:\s*\d+/.test(sections)) {
    throw new Error('no registration declares an order, so its position is undefined');
  }

  const guards = (sections.match(/if \(!subject \|\| !subject\.kind\) return null;/g) || []).length;
  if (guards < 2) {
    throw new Error(`only ${guards} component(s) guard a missing subject; an unexpected subject would throw on the detail page`);
  }

  const mountIdx = footer.indexOf('mountDetailSections');
  if (mountIdx < 0) throw new Error('apply() never calls mountDetailSections');
  const afterMount = footer.slice(mountIdx);
  if (!/catch \(error\)/.test(afterMount)) {
    throw new Error('the detail-section mount is not wrapped in its own try/catch');
  }
  if (footer.indexOf('kernel.start()') > mountIdx) {
    throw new Error('the detail-section mount runs before kernel.start(), so a slot failure would stop the theme painting');
  }

  return 'documented slot, 2 registrations with ids+orders, guarded per subject, mounted last in its own guard';
});

check('sidebar status: registered in its own guard, reads the host prop, and never fakes usage', () => {
  // D71 adds a second host slot, so the same three risks apply plus one specific to this row:
  // the reference's footer shows a token count that no client plugin can know, and the whole point
  // of the row's design is that it states something TRUE instead. A future edit that reintroduces a
  // usage figure - as a literal, or as a plausible-looking placeholder - would make this row lie,
  // which is worse than the row not existing.
  const status = readFileSync(join(root, 'src', '62-sidebar-status.js'), 'utf8');
  const footer = readFileSync(join(root, 'src', '99-footer.js'), 'utf8');

  if (!/ctx\.slots\.inject\('sidebar\.footer\.action'/.test(status)) {
    throw new Error("never injects 'sidebar.footer.action' - the row will not mount");
  }
  if (!/name: 'sidebar\.footer\.action'/.test(status)) {
    throw new Error('registers without the documented slot name');
  }
  if (!/id: 'bento-status'/.test(status)) throw new Error('registration has no id');
  if (!/order:\s*\d+/.test(status)) throw new Error('registration has no order');

  // The host passes exactly { wide }; reading any other key means the row renders in the 56px rail.
  if (!/props\.wide/.test(status)) {
    throw new Error('does not read the host prop "wide", so it cannot hide in the collapsed rail');
  }

  // NO INVENTED USAGE. This row exists because the reference's "516M today" is unbuildable; any
  // token/balance/currency figure appearing here means someone faked it.
  if (/\b(tokens?|balance|credit|billing|usd|\\\$)\b/i.test(status.replace(/\/\*[\s\S]*?\*\//g, ''))) {
    throw new Error('the status row mentions usage/billing data, which no client plugin can obtain - see D70 §4.1');
  }
  // and no fabricated number: the only numeric output must come from the feature count
  if (/['"`]\s*\d+\s*(M|K|B)\s*(tokens?)?['"`]/i.test(status)) {
    throw new Error('the status row contains a literal magnitude (e.g. "516M tokens") rather than a computed count');
  }

  // Mounted in its own guard, after the detail sections.
  const idx = footer.indexOf('mountSidebarStatus');
  if (idx < 0) throw new Error('apply() never calls mountSidebarStatus');
  if (!/catch \(error\)/.test(footer.slice(idx))) {
    throw new Error('the sidebar status mount is not wrapped in its own try/catch');
  }
  if (footer.indexOf('mountDetailSections') > idx) {
    throw new Error('the status row mounts before the detail sections, so one slot failure could take the other');
  }

  return 'documented slot, reads { wide }, no usage data, own guard after the detail sections';
});






check('paint order: every card is behind its column content by z-index, never by lifting descendants', () => {
  // D73. This is the gate for a bug that shipped, so it pins the mechanism that replaced it.
  //
  // THE BUG. Each column paints its card on an absolutely positioned ::after. With z-index: auto a
  // pseudo-element like that paints ABOVE static in-flow content, so the card covers the column's
  // own text. The original fix hoisted the content instead:
  //
  //     [part="center"] > * > *:not([data-slot]) { position: relative; z-index: 1 }
  //
  // That is a FIXED-DEPTH selector. The 0.2.2 host inserted one wrapper inside the centre column,
  // the rule went from matching 1 element to 0, and every conversation lost its transcript - the
  // user bubble, the reply and the error text all rendered under a white card. Nothing threw, no
  // gate failed, and the text was present, positioned, correctly coloured and geometrically
  // correct in the DOM. Only pixels showed it.
  //
  // THE RULE NOW. The column is a stacking context (isolation: isolate) and its card is at
  // z-index: -1. Paint order then depends on z-index, not on how many wrappers the host nests, so
  // no descendant needs position or z-index and the failure mode cannot recur at a new depth.
  // Both halves are required: -1 without isolation escapes behind the frame's canvas.
  //
  // What this gate can and cannot see: it is a source check, so it holds the MECHANISM. Whether
  // the pixels are right is a render question, measured separately (learning.md L110).
  const parts = {
    sidebar: readFileSync(join(root, 'src', '40-feature-sidebar.js'), 'utf8'),
    center: readFileSync(join(root, 'src', '47-feature-center.js'), 'utf8'),
    rightbar: readFileSync(join(root, 'src', '49-feature-rightbar.js'), 'utf8'),
  };

  for (const [name, source] of Object.entries(parts)) {
    // Normalise interpolations first: the literal text contains an interpolation whose brace is
    // indistinguishable from a rule opener to a naive regex. Same trap the spacing gate documents.
    const flat = source.replace(/\$\{[^}]*\}/g, 'X');

    // THEN STRIP COMMENTS, before ANY assertion, and this is load-bearing. Gate 30 failed its own
    // proof because of it: the PAINT ORDER block above quotes both 'z-index: -1' and
    // 'isolation: isolate' verbatim, so every check that read prose passed on the documentation.
    // Deleting isolation:isolate from the column rule left the gate GREEN until comments were
    // excluded. A gate its own explanation can satisfy is not a gate. (The mirror-image failure is
    // on record too: a planted defect that landed inside a comment and was therefore never
    // exercised - learning.md L105.)
    const code = flat.replace(/\/\*[\s\S]*?\*\//g, '');

    if (!/isolation:\s*isolate/.test(code)) {
      throw new Error(name + ': the column is not a stacking context, so a z-index:-1 card escapes behind the canvas');
    }

    const cardRule = /::after\s*\{([\s\S]*?)\n\}/.exec(code);
    if (!cardRule) throw new Error(name + ': the card ::after rule could not be located, so paint order is unverified');
    if (!/z-index:\s*-1/.test(cardRule[1])) {
      throw new Error(name + ': the card ::after has no z-index: -1, so it paints over the column content');
    }

    // The regression itself: a depth-based descendant lift must not come back.
    if (/>\s*\*\s*>\s*[^,{\n]*\{[^}]*z-index:\s*[1-9]/.test(code)) {
      throw new Error(name + ': a fixed-depth descendant is hoisted with z-index - the depth-dependent bug is back');
    }
    if (/position:\s*relative;\s*\n\s*z-index:\s*[1-9]/.test(code)) {
      throw new Error(name + ': a descendant is lifted with position+z-index; the card belongs behind by z-index instead');
    }
  }

  return 'sidebar, center and rightbar isolate their column and paint the card at z-index -1; no descendant lift remains';
});

const results = await runAll();

for (const entry of results) {
  if (entry.ok) console.log(`  ok   ${entry.name} (${entry.detail})`);
  else console.log(`  FAIL ${entry.name}: ${entry.error}`);
}

const failureCount = results.filter((entry) => !entry.ok).length;
console.log(
  failureCount === 0
    ? `\nverify: all ${results.length} checks passed`
    : `\nverify: ${failureCount} check(s) FAILED — do not install this bundle`,
);
process.exit(failureCount === 0 ? 0 : 1);
