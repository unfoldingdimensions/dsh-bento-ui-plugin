# Contributing

One feature or one fix per commit. This is the rule for this repository, not a
preference.

## The loop

```
1. change src/ (never client.js — it is generated)
2. node build.mjs            regenerate client.js
3. node --check client.js    syntax gate
4. node verify.mjs           13 checks; non-zero blocks the commit
5. verify in a browser       see "Proving a UI change" below
6. commit                    one feature, or one fix
7. push
```

Step 4 is not optional. A bundle whose host half fails to import aborts the whole
application's startup, so a broken commit is not "a broken feature", it is "the app
does not boot".

## Commit messages

Conventional Commits. The subject says what changed, the body says why, and any
surprising measurement goes in the body because it is the part a future reader
cannot reconstruct.

```
feat(page-rows): give Plugins-page rows the tile treatment

Rows were flat transparent strips on the card. 13 rows, all already
rounded 20px by the host, with a 2px gap — they wanted a surface, not
a redesign.

Scoped to `section ul > li` rather than the hashed class the page
actually uses, because a hash breaks on the next build.
```

```
fix(center-card): lift content above the card on every page

Scoping both the lift and the background-clear to the conversation
deleted the Plugins page's text: computed style looked fine, the
screenshot was blank. The two rules need opposite scopes.
```

Prefixes in use: `feat`, `fix`, `docs`, `refactor`, `test`, `chore`.

## What counts as one commit

- One feature from the registry (`src/NN-feature-<name>.js`) plus its docs.
- One defect and its fix.
- A docs correction on its own, if it is not riding along with code.

Do **not** bundle a feature and a fix in one commit. If the feature is not shippable
without the fix, that is a sign the feature is two commits.

## Proving a UI change

Reading CSS is not verification. This project has a documented history of changes
that passed source review and pure-logic tests and were obviously wrong the moment
a browser rendered them.

```
1. probe the DOM       what is the element, is it stable, what does it measure
2. prove the selector  count the matches; a selector matching 0, or 3 when you
                       wanted 1, is a defect
3. write the CSS
4. render in Chrome    against an ISOLATED profile — never the desktop profile,
                       whose recovery path rewrites the user's config
5. measure             contrast, box geometry, element counts, wrap state
6. read the pixels     when your eye and computed style disagree, the screenshot's
                       own pixels win
7. tear the rig down   the isolated profile must be byte-identical afterwards
```

Never test in the desktop profile. Its recovery path is destructive and has already
rewritten a real config once (see `learning.md` L1).

## The gates, and why they exist

`verify.mjs` exists because every check in it was added after a real failure:

| Check | Added after |
|---|---|
| manifest, host import, bundle parse | a bundle that aborted app startup |
| CSS blocks balanced | a backtick in a CSS comment silently truncating a stylesheet |
| no backtick in a CSS comment | the same bug, twice |
| fragment ordering | a constant declared in a later fragment than the one reading it |

**When you add a gate, prove it fails first.** Plant the violation, watch it go red
with a readable message, remove it. A check never seen failing is indistinguishable
from one that cannot fail. Two of these gates were themselves broken when first
written — one flagged twelve false positives on a clean tree, another passed a
planted violation.

## Docs move with the code

`decision.md` (what and why, append-only), `architecture.md` (contracts and
measured facts), `flow.md` (canonical sequences), `learning.md` (what cost time and
why). A change that makes one of them untrue updates it in the same commit.

Never let a doc describe something the code does not do. Mark it `proposed` or
leave it unwritten until it lands.
