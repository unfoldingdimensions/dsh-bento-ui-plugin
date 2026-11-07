/**
 * Feature: sidebar as a card.
 *
 * The sidebar column's only child is the slot anchor `[data-slot="sidebar"]`,
 * which the renderer gives `display: contents` (zero-size, out of layout). So the
 * card cannot hang on that child — it has no box. Instead the card is painted on
 * the column itself and the anchor's own children are laid inside it, which is
 * also what keeps the host's scroll container intact.
 *
 * TWO THINGS HAD TO CHANGE for the card to be visible at all.
 *
 * 1. The host's own content root covers it. The anchor's child (`hHd-Xa_root`)
 *    paints an opaque sidebar-fill rectangle at `border-radius: 0` across the
 *    whole card interior, so only the gutter ring was ever visible. That is why
 *    this feature looked like a "white on white" contrast problem for two
 *    sessions — the interior being measured was never this card. The root's fill
 *    is cleared here, and the root is re-created as the card's content layer.
 *
 * 2. The root is WIDER than the column's padding box. Measured: column 280px with
 *    8px padding gives a 264px content box, but the root inside is 280px. It was
 *    spilling 16px past the card's edge, invisible only because the spill matched
 *    the canvas colour. `max-width: 100%` clamps it, which is also what keeps
 *    content inside the card's rounded corner.
 *
 * Track geometry is never touched, so the drag handle on the column boundary
 * keeps working.
 */
    const SIDEBAR_CSS = `
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.SIDEBAR}"] {
  /* The gutter is padding *on the column*, so the track width and every
     handle position computed from it stay exactly as the host solved them. */
  padding: var(--dsh-bento-gutter);
  box-sizing: border-box;
  /* The column becomes the containing block for the card painted in ::after.
     It paints no fill of its own: the canvas belongs to the frame, so the card
     sits directly on it. */
  position: relative;
  background: transparent;
  border-right: 0;
  /* A stacking context, so the card at z-index -1 stays inside this column and
     cannot paint behind the frame's canvas. See PAINT ORDER below. */
  isolation: isolate;
}

/* The card: its own surface, edge and rounding, inset by the gutter above.
   It sits in a pseudo-element so the column keeps its own single content child;
   pointer-events are off so the card never intercepts a click. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.SIDEBAR}"]::after {
  content: "";
  position: absolute;
  inset: var(--dsh-bento-gutter);
  border-radius: var(--dsh-bento-radius);
  background: var(--dsh-bento-card);
  border: 1px solid var(--dsh-bento-edge);
  pointer-events: none;
  z-index: -1;
}

/* PAINT ORDER: THE CARD GOES BEHIND, THE CONTENT IS NEVER TOUCHED.
 *
 * Same mechanism and the same history as the conversation card (47-feature-center.js):
 * an absolutely positioned pseudo with 'z-index: auto' paints above static in-flow
 * content, and the old answer — hoisting the root with a fixed-depth '> * > *' selector
 * plus 'position: relative; z-index: 1' — stopped matching when the 0.2.2 host changed
 * the nesting depth. 'z-index: -1' inside an isolated column is depth-independent.
 *
 * What remains here is only the part that is genuinely about the host's own painting:
 * the content root's opaque fill and its over-wide box. */

/* The host's content root, addressed structurally rather than by name.
   The direct child of the column is the display:contents anchor, which has no
   box, so the child of that anchor is exactly the root the column lays out —
   usually one element, never the whole subtree. Its opaque fill is what hid the
   card. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.SIDEBAR}"] > * > * {
  background: transparent;
  /* The root is wider than the column's padding box by the host's own layout;
     clamped, it matches the card and stops spilling past the rounded corner. */
  max-width: 100%;
  box-sizing: border-box;
}

/* The rail has 56px of width; the card needs the tighter radius there or it
   reads as a pill. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.FRAME}"][data-sidebar-collapsed] [${PART_ATTR}="${PART.SIDEBAR}"]::after {
  border-radius: var(--dsh-bento-radius-rail);
}
`;

    FEATURES.push({
      id: 'sidebar-card',
      title: { en: 'Sidebar card', zh: '侧栏卡片' },
      about: {
        en: 'Inset the session sidebar onto its own rounded card.',
        zh: '把会话侧栏收进一张圆角卡片。',
      },
      order: 10,
      enabled: true,
      css: SIDEBAR_CSS,
    });
