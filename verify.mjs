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
  const HOST_OWNED = /\[data-slot\]\s*>|\[data-shortcut-modal[^\]]*\]\s*>\s*(?!nav)|\[class\*="/;

  // VERIFIED SAFE EXEMPTION. The Settings content column is `position: static` in the
  // host (measured with the theme off), so `position: relative` on it does not detach
  // anything — it only makes the column the containing block for the card painted on
  // its ::before. Measured both states: content 612x800, fills the panel, the real
  // scroller still `overflowY: auto` and scrolls. Declared here rather than special-cased
  // silently, so the next reader knows it was checked.
  const SAFE = /\[data-shortcut-modal="settings"\] > div:has\(\[data-slot="settings\.section"\]\)/;

  for (const name of readdirSync(join(root, 'src')).filter((f) => f.endsWith('.js')).sort()) {
    const lines = readFileSync(join(root, 'src', name), 'utf8').split('\n');
    // Track the rule properly: open on a line ending with `{`, close on a bare `}`.
    // The first version never reset, so every later declaration inherited the first
    // selector and six legitimate declarations were flagged on a clean tree.
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
        if (trimmed === '}') { depth = 0; current = null; continue; }
        if (!/^position:\s*(relative|absolute|fixed);/.test(trimmed)) continue;
        if (!current) continue;
        if (SAFE.test(current)) continue;
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
  const offenders = [];
  for (const name of readdirSync(join(root, 'src')).filter((f) => f.endsWith('.js')).sort()) {
    if (name === GENERATED_FONT_DATA) continue;
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
