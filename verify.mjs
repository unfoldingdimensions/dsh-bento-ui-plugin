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
  const offenders = [];
  for (const name of readdirSync(join(root, 'src')).filter((f) => f.endsWith('.js')).sort()) {
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
