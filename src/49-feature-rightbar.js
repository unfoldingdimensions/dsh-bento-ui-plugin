/**
 * Feature: the right panel as a card.
 *
 * The right column holds a docked terminal/file pane that the user opens from the
 * conversation header ("Open right sidebar"). It defaults to 0px wide and
 * collapsed, which is why it went unverified for the whole redesign: every
 * measurement returned a zero-width column and `::after` content `none`.
 *
 * TWO THINGS made this harder than the sidebar and centre cards.
 *
 * 1. FOUR anchors, not one. The panel root sits under a chain of nested
 *    `display: contents` anchors, one per slot level:
 *
 *      div[part=rightbar]
 *       └─ div[data-slot="rightbar"]              contents
 *           └─ div.P3OORG_session                 contents
 *               └─ div[data-slot="rightbar.session"]  contents
 *                   └─ div.P3OORG_panel           720x900  <- the root
 *
 *    A depth-based rule (`> * > *`) could never reach it. Anchors are identified
 *    by `data-slot`, which the root does not carry, so
 *    `[data-slot] > *:not([data-slot])` reaches the root at any depth.
 *
 * 2. The root is not the last thing painting. Inside it, a `_tabHost` element
 *    paints an opaque white rectangle across the whole pane. Clearing only the
 *    root left the card visible as a thin edge with the pane's white on top —
 *    measured: card at x 892..1588, pane at x 892 painting white over all of it.
 *    The pane is therefore cleared too.
 *
 * Verified open, at 1600x900: 8 entries, 6 buttons and 137 characters of text all
 * survive; nothing spills past the card; the card is 696px inside a 720px column.
 */
    const RIGHTBAR_CSS = `
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.RIGHTBAR}"] {
  /* Gutter as padding on the column, so the track width the host solved — and the
     drag handle at its boundary — is untouched. */
  padding: var(--dsh-bento-gutter);
  box-sizing: border-box;
  /* The containing block for the card, and no fill of its own. */
  position: relative;
  background: transparent;
}

html[${ROOT_ATTR}] [${PART_ATTR}="${PART.RIGHTBAR}"]::after {
  content: "";
  position: absolute;
  inset: var(--dsh-bento-gutter);
  border-radius: var(--dsh-bento-radius);
  background: var(--dsh-bento-card);
  border: 1px solid var(--dsh-bento-edge);
  pointer-events: none;
}

/* The panel root, reached through any number of anchors. Clearing its fill is what
   lets the card show; max-width stops it spilling past the rounded corner.
 *
 * NO position HERE, AND THAT IS LOAD-BEARING.
 *
 * The host positions this element position: absolute with top/right/bottom/left: 0
 * (.P3OORG_panel). Its HEIGHT comes entirely from being anchored to all four edges of
 * the column. Setting position: relative — as an earlier version of this rule did —
 * silently overrides that: the element stops being edge-anchored, has no height of its
 * own, and collapses to its content. Measured: panel 900px -> 288px, and everything
 * below the fold became unreachable because every wrapper in the pane is
 * overflow: hidden. The visible symptom was "the right panel does not scroll".
 *
 * It was not a scroll bug. It was a collapsed box.
 *
 * z-index also had to go. It only applies to positioned elements, so it was doing
 * nothing here except documenting an intent that position: relative was supposed to
 * serve. The card is painted on the COLUMN's ::after, which is a pseudo-element of the
 * column itself — the panel is a later child in paint order and sits above it already.
 * Verified: with both declarations removed the card is still visible (696px inside a
 * 720px column, 0 elements spilling) and the panel is 900px. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.RIGHTBAR}"] [data-slot] > *:not([data-slot]) {
  background: transparent;
  max-width: 100%;
  box-sizing: border-box;
}

/* The tab host is the element that actually paints the pane's white surface, one
   level inside the root. Without this the card is only ever a thin edge. The inner
   radius matches the card so the pane's own content sits inside the rounding. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.RIGHTBAR}"] [class*="tabHost"] {
  background: transparent;
  border-radius: var(--dsh-bento-radius-inner);
  overflow: hidden;
}
`;

    FEATURES.push({
      id: 'rightbar-card',
      title: { en: 'Right panel card', zh: '右侧栏卡片' },
      about: {
        en: 'Inset the docked right panel onto its own card, matching the other columns.',
        zh: '把停靠的右侧栏也收进一张卡片，与其他栏保持一致。',
      },
      order: 17,
      enabled: true,
      css: RIGHTBAR_CSS,
    });
