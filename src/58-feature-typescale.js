/**
 * Feature: a type scale (D80).
 *
 * The theme styled surfaces and spacing but never type. Measured before this file existed,
 * every heading in the shell was the host's own, and the host's headings are flat:
 *
 *   page title      h1  20px / 500 / tracking normal
 *   section title   h3  14px / 500 / tracking normal
 *   group label     span 14px / 400 / tracking normal, muted
 *
 * The reference has a scale, and it is not that: a 26px/700 title with tightened tracking,
 * 15-17px/600 section titles, and 11px/600/0.06em UPPERCASE eyebrow labels above groups.
 * The gap is why a themed page still read as host UI inside a bento frame.
 *
 * WHAT THIS DOES NOT DO. It does not touch body copy, captions, buttons, chips or any
 * control the host sized. Those were tuned against a working layout, and re-sizing them
 * would move text the theme has no reason to move. This file changes three roles only -
 * the page title, the section title, and the group eyebrow - because those are the three
 * places the reference's hierarchy is legible and the host's is not.
 *
 * EVERY SELECTOR IS COUNTED. The host's class names are hashed per build, so all three are
 * addressed by class SUBSTRING, which is the technique the rest of the theme uses for the
 * same reason. Measured match counts on this host before the rules were written:
 *
 *   [class*="pageTitle"]    1  (the Plugins page h1)
 *   [class*="detailTitle"]  1  (a plugin detail page's h3)
 *   [class*="groupTitle"]   2  (the two group headings on the Plugins page)
 *   [class*="sectionLabel"] 1  (the sidebar's "Workspaces")
 *
 * A substring that matches zero is the failure mode this census exists to catch: the rule
 * would be present, valid, and paint nothing.
 *
 * THE EYEBROW IS THE ONE DIRECT COPY. The reference's own bundled sidebar labels its group
 * "Workspaces" with exactly `11px / 600 / letter-spacing 0.06em / uppercase / muted`, and
 * this shell's sidebar has the same label in the same place. That is not an analogy - it is
 * the same object with the same word in it, so the value is adopted unchanged.
 */
    const TYPESCALE_CSS = `
/* THE PAGE TITLE.
 *
 * 26px, not the reference dashboard's 32px. 32 is used on a 12-column chart page with a
 * full-width h1 and nothing beside it; these pages put the title in a header row that also
 * carries a toolbar (measured: pageHeading + toolbar), and the centre column is 1296px.
 * 26 is the reference's own plugin-detail title size, which is the closest analogue to the
 * pages this theme mounts, and it is enough of a step over the host's 20 to read as a
 * title rather than a label.
 *
 * 700 and -0.025em are the reference's, unchanged, and they are why the size change reads
 * as hierarchy rather than as "bigger text": tracking tightens as the size grows in that
 * design, and weight does the rest. The line box is 1.15, the reference's own value for
 * the 32px tier (it declares none on the 26px one), so a two-line title cannot sit tighter
 * than its glyphs.
 *
 * BOTH TITLE HOOKS ARE COVERED, because this shell has two: a full page (h1) and a plugin
 * detail page (h3, same 20px/500 host spec). Leaving the second at 20 would have made two
 * pages of the same kind disagree by one tier.
 *
 * The margins are NOT touched. The host already spaces this block against the subtitle and
 * the toolbar; changing the size is the request, and re-solving that header's layout is not. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.CENTER}"] [class*="pageTitle"],
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.CENTER}"] [class*="detailTitle"] {
  font-size: var(--dsh-bento-text-title);
  font-weight: 700;
  letter-spacing: var(--dsh-bento-tracking-title);
  line-height: var(--dsh-bento-leading-title);
}

/* THE SECTION TITLE.
 *
 * 15px / 600, the reference's SMALL-CARD tier, not its 17px full-width tier. The 17px
 * heading heads a large card in a 12-column board; these headings sit above a list of rows
 * inside one card, which is the small-card shape. 15/600 is also what this theme's own
 * detail sections already rendered (D-p1), so the two kinds of section in the shell now
 * agree instead of differing by a pixel and a half.
 *
 * The host's own weight here is 500 and its size 14 - close enough that a rendering diff
 * alone would not show the problem, which is why the case for this is the reference's
 * scale and not a defect report. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.CENTER}"] [class*="groupTitle"] {
  font-size: var(--dsh-bento-text-section);
  font-weight: 600;
}

/* THE GROUP EYEBROW.
 *
 * Adopted from the reference unchanged: 11px / 600 / 0.06em / uppercase / muted. Tracking
 * OPENS as the size falls, which is the opposite of the title, and that inversion is the
 * whole reason the small label reads as deliberate rather than as shrunken text.
 *
 * APPLIED TO THE SIDEBAR ONLY. This is the group label above a list of workspaces - the one
 * object in the shell that is structurally the reference's eyebrow. The same class substring
 * does not appear anywhere else on this host (measured: 1 match), so the selector is already
 * narrower than the rule; the part selector is written anyway so a future page that grows a
 * section label is not silently uppercased by a theme.
 *
 * The colour is the host's own muted alias, which is what the reference uses too. A theme
 * must not invent a fifth grey for a label the host already paints. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.SIDEBAR}"] [class*="sectionLabel"] {
  font-size: var(--dsh-bento-text-eyebrow);
  font-weight: 600;
  letter-spacing: var(--dsh-bento-tracking-eyebrow);
  text-transform: uppercase;
  color: var(--dsw-alias-label-secondary);
}
`;

    FEATURES.push({
      id: 'type-scale',
      title: { en: 'Type scale', zh: '字号层级' },
      about: {
        en: 'Give page titles, section titles and group labels the reference sizes and weights, instead of the flat 20/14/14 the host uses.',
        zh: '让页面标题、小节标题与分组标签采用参考设计的字号与字重，而不是宿主统一的 20/14/14。',
      },
      order: 27,
      enabled: true,
      css: TYPESCALE_CSS,
    });
