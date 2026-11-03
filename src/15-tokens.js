/**
 * Design tokens for the bento layout, and nothing else.
 *
 * Values live in one place so a feature never writes a raw length or colour.
 * Every colour is a host alias token, so light, dark and any registered theme
 * follow automatically and this file introduces no shade of its own.
 *
 * IMPORTANT — where these are declared:
 * a custom property is substituted on the element that declares it, and values
 * do not inherit *upward*. The host defines `--dsw-alias-*` on `<body>`, so a
 * `var(--dsw-alias-...)` written on `html` resolves against nothing and silently
 * paints transparent. Every token that references a host alias is therefore
 * declared on `body`, which is the correct inheritance root for them. Literal
 * values (lengths, durations) are safe anywhere.
 *
 * The scale is deliberately small: 4px rhythm, three radii, one edge.
 */
    const BASE_CSS = `
html[${ROOT_ATTR}] {
  /* Spacing: 4px rhythm. 12px is the widest gutter the sidebar survives: the
     session rows fit at 12, and 13 of 13 overflow the column at 14. */
  --dsh-bento-gutter: 12px;
  --dsh-bento-gap: 8px;

  /* Radii: card, inner, rail.
   *
   * The card is 20px, the host's own --dsw-radius-xl, so a card matches the shells
   * around it. The inner tier is 12px, the host's --dsw-radius-md, for three reasons
   * that all point the same way:
   *
   *   1. The host uses 12px on every row in this column. Measured with the whole
   *      plugin switched off: New Session 12, nav destinations 12, workspace headings
   *      12, session rows 12.
   *   2. 12px is on the host's own radius scale (8 / 12 / 16 / 20). The previous
   *      value, 14px, was the only radius in the theme not on it.
   *   3. It closes the gap the old value opened. With row-tiles on, four rows sat at
   *      two different radii in the same card — New Session 12 beside a nav row at 14,
   *      workspace headings 12 above session rows at 14 — because the theme overrode
   *      only some of them.
   *
   * A correction is recorded in decision.md (D45): an earlier entry claimed the host's
   * nav cell measured 14px. It does not. That measurement was taken with row-tiles
   * active and read this theme's own declaration back.
   *
   * Concentric maths would ask for 6-8px at a 12-14px inset under a 20px card, which
   * would be tighter still. It is not followed here because the host's own rows are at
   * 12 and the point of this tier is to agree with them, not to out-derive the shell
   * the theme is drawing on. */
  --dsh-bento-radius: 20px;
  --dsh-bento-radius-inner: 12px;
  --dsh-bento-radius-rail: 10px;

  /* Motion: one duration, one curve, shared by every feature. */
  --dsh-bento-motion: 160ms;
  --dsh-bento-ease: cubic-bezier(0.2, 0, 0, 1);
}

/* Surfaces are declared on the body element (see the note above). */
html[${ROOT_ATTR}] body {
  /* The canvas is a cool blue-grey, one step away from the host's neutral. This
     token is the host's own selected-row tone: #ebeef2 in light, which is within
     3.5 RGB units of the #EDF0F4 a dashboard of this style uses, and it lifts the
     card's contrast from 1.045 to a visible 1.164. */
  --dsh-bento-canvas: var(--dsw-specific-sidebar-nav-item-active);
  /* The raised surface. This is the host's own elevated panel tone (the Settings
     dialog itself is painted with it), and it is the one surface token that reads
     as raised in BOTH themes. The bg-base alias cannot be used here: it is #fff in
     light (fine) but #151517 in dark, which is darker than the #1b1b1c canvas, so
     the same card would read as a recess rather than a card. Verified: layer-2 is
     #fff in light and #2c2c2e in dark, lighter than the canvas in both. */
  --dsh-bento-card: var(--dsw-alias-bg-layer-2);
  --dsh-bento-edge: var(--dsw-alias-border-l2);
  /* A pointer surface that works on either backdrop, because it is translucent
     rather than a fixed tone. */
  --dsh-bento-hover: var(--dsw-alias-interactive-bg-hover);
}

/* Dark mode needs a different canvas token, not the same one. The cool grey above
   is #43454a in dark, which is LIGHTER than the #2c2c2e card, so the layering
   would invert and the card would read as a recess. The host's dark sidebar fill
   is #1b1b1c: still the backdrop tone, and correctly below the card. */
html[${ROOT_ATTR}] body[data-ds-dark-theme] {
  --dsh-bento-canvas: var(--dsw-specific-sidebar-fill);
}

/* The canvas itself. Painted on the frame so every column sits on one backdrop.
   This lives with the tokens because it is the canvas, not a feature: with every
   feature switched off the root attribute is absent and none of this applies. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.FRAME}"] {
  background: var(--dsh-bento-canvas);
}

/* The collapsed rail has 56px of width; a card there needs the tighter radius
   and the tighter gutter or it reads as a pill. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.FRAME}"][data-sidebar-collapsed] {
  --dsh-bento-gutter: 4px;
  --dsh-bento-radius: 10px;
}

/* Respect the platform's reduced-motion preference: a theme must not be the
   reason a user's setting is ignored. */
@media (prefers-reduced-motion: reduce) {
  html[${ROOT_ATTR}] {
    --dsh-bento-motion: 0ms;
  }
}

/* WINDOWS HIGH CONTRAST.
 *
 * Under forced-colors every background the theme paints is replaced by a system
 * colour, so the canvas, the card and the page all resolve to the same white: the
 * composition collapses to one plane and every feature that works by fill becomes a
 * no-op. That part is unavoidable and is the correct behaviour — a user who asks for
 * high contrast is asking for exactly this.
 *
 * What is NOT correct is the second effect. Several rules in this theme declare a
 * TRANSPARENT border as a layout spacer: the session and nav rows reserve 1px above
 * and below so the edge can appear on hover without moving the row (45-feature-rows,
 * D-session-tiles). Forced-colors replaces a transparent border with the system text
 * because it cannot know the author's transparent border was meant to be invisible.
 * Measured: 0 of 8 rows show a visible border normally, 8 of 8 under forced-colors —
 * every row grows a hard black box it was never meant to have.
 *
 * So the spacer borders are withdrawn in this mode and their 2px replaced by 2px of
 * padding, which forced-colors does not touch. The row keeps its exact 34px box
 * (32px content + 2px padding instead of 32px + 2x1px border). The property
 * forced-color-adjust is NOT used — it inherits, and would switch high contrast off
 * for the row's text and its switch, which is precisely what the user asked for.
 *
 * The card edges are left alone: they are real edges, drawn on purpose, and forcing
 * them to CanvasText is the desired result — it is what keeps the three-surface
 * composition legible once every fill has been flattened.
 *
 * WHY THE SELECTOR IS DOUBLED. This block lives in BASE_CSS, which the kernel PREPENDS
 * to the feature stylesheets, and the feature rule that declares the spacer border has
 * identical specificity. Same specificity, earlier source order: the feature wins and
 * the border comes back. Measured — the first version of this block was a no-op and 8
 * of 8 rows still showed a box.
 *
 * Repeating the subject selector raises specificity above the feature rule without
 * !important, and without moving this block after the features. The token layer stays
 * first because everything else reads from it.
 *
 * The two controls need DIFFERENT compensation, because their vertical padding
 * differs, and padding-block replaces rather than adds:
 *
 *   session row   padding 0        + 1px border each side => 34px
 *                 becomes padding 1px block              => 34px, unchanged
 *   nav button    padding 7px block + 1px border each side => 38px
 *                 becomes padding 8px block              => 38px, unchanged
 *
 * Writing a single padding-block: 1px for both (the first attempt) fixed the session
 * rows and silently shrank every nav button by 2px, because it REPLACED the 7px that
 * was already there. Measured: nav row 38px -> 36px. */
@media (forced-colors: active) {
  html[${ROOT_ATTR}] [${PART_ATTR}="${PART.SIDEBAR}"] [data-row-key^="session:"][data-row-key^="session:"] {
    /* Had no vertical padding: the border's 2px becomes padding's 2px. */
    border-width: 0;
    padding-block: 1px;
  }

  html[${ROOT_ATTR}] [${PART_ATTR}="${PART.SIDEBAR}"] [class*="panelList"][class*="panelList"] > button {
    /* Had 7px: the border's 1px each side is added to it, not substituted for it. */
    border-width: 0;
    padding-block: 8px;
  }
}
`;
