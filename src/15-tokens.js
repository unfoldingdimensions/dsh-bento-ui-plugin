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

  /* Radii: card, inner, rail. 20/14 is the dashboard proportion, scaled down from
     the reference's 24/18 because a column here is narrower than a 660px card. */
  --dsh-bento-radius: 20px;
  --dsh-bento-radius-inner: 14px;
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
`;
