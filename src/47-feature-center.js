/**
 * Feature: the conversation column as a card.
 *
 * Same mechanism as the sidebar card, applied to the widest column:
 *
 *   - the column stops painting anything and becomes the card's containing block
 *   - the card is painted on ::after, inset by the gutter
 *   - the host's content root is cleared, clamped and lifted above the card
 *
 * The content root here is addressed the same structural way as the sidebar:
 * the column's DOM child is a display:contents anchor with no box, so the child
 * of that anchor is exactly the root the column lays out.
 *
 * TWO THINGS ARE DIFFERENT FROM THE SIDEBAR.
 *
 * 1. The composer needs a surface of its own. Once the conversation sits on a white
 *    card, the composer - which the host also paints white - has no edge at all
 *    (measured contrast 1.0). It is now white with a hairline and the theme's soft
 *    shadow: a raised control on the card, not a recessed panel. That reverses an
 *    earlier decision that tinted it with the canvas, which read as a blue-grey slab
 *    on a wide surface (D61).
 *
 * 2. The composer's edge is an inset shadow, not a border. A border would add 2px
 *    to a control the host has already sized, and this project has broken a
 *    host-sized control once by nudging its box (D14). An inset shadow paints the
 *    same hairline and costs no layout.
 */
    const CENTER_CSS = `
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.CENTER}"] {
  /* The gutter is padding on the column, so the track width and every drag-handle
     position computed from it stay exactly as the host solved them. */
  padding: var(--dsh-bento-gutter);
  box-sizing: border-box;
  /* The containing block for the card painted in ::after. No fill of its own: the
     canvas belongs to the frame, so the card sits directly on it. */
  position: relative;
  background: transparent;
}

/* The card. Painted in a pseudo-element so the column keeps its own single content
   child, and pointer-events are off so the card never intercepts a click. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.CENTER}"]::after {
  content: "";
  position: absolute;
  inset: var(--dsh-bento-gutter);
  border-radius: var(--dsh-bento-radius);
  background: var(--dsh-bento-card);
  border: 1px solid var(--dsh-bento-edge);
  pointer-events: none;
}

/* LIFT: everything the column lays out must paint above the card.
 *
 * This is separate from clearing a background, and it has to apply to every page
 * that mounts here, not just the conversation. The card is an absolutely
 * positioned pseudo-element, so by default it paints ABOVE static in-flow content.
 * Without this lift, a page's text renders underneath the card and disappears —
 * which is exactly what happened when an earlier version of this file scoped the
 * whole rule to the conversation: the Plugins page lost all its text and kept only
 * its (positioned) switches.
 *
 * So the lift uses the broad, depth-tolerant selector. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.CENTER}"] > * > *:not([data-slot]),
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.CENTER}"] > * > * > *:not([data-slot]) {
  position: relative;
  z-index: 1;
}

/* CLEAR: the conversation root's own opaque fill, so the card is visible.
 *
 * Scoped to the conversation by WHERE it lives, not by depth. The centre column
 * also hosts the Plugins and MCP-connector pages, each with its own root and its
 * own painted sections. The earlier broad version matched 4 elements on the
 * Plugins page (page, head, group, group) against 1 on the conversation — harmless
 * there only because those elements happened to be transparent, but a page that
 * painted its own background would have been silently erased.
 *
 * The conversation root is identified by the host's own semantic anchors for the
 * conversation slot (main / main.conversation). A page mounts under a different
 * anchor and is therefore untouched. max-width keeps the root from spilling past
 * the card's rounded corner. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.CENTER}"] [data-slot="main"] [data-slot="main.conversation"] > *:not([data-slot]),
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.CENTER}"] [data-slot="main"] [data-slot="main.conversation"] > * > *:not([data-slot]) {
  background: transparent;
  max-width: 100%;
  box-sizing: border-box;
}

/* The composer, RAISED rather than recessed (D61).
 *
 * The previous version painted it the canvas tone (#ebeef2) and called it a panel
 * recessed into the card. Measured, that tone is 1.16:1 against the card - a real but
 * very slight step, and on a 861px-wide surface it reads as a blue-grey slab laid over
 * the conversation rather than as a control. The owner's report was the right one.
 *
 * It is now the same white as the card, edged with the hairline, and lifted with the
 * theme's own soft shadow. That is what the reference actually does with its raised
 * surfaces: --surface is #FFFFFF everywhere and separation comes from the border
 * (#E3E7EE) and the shadow, with --panel (#F3F6FC) reserved for the CALM surfaces
 * behind a card, not for a control sitting on one.
 *
 * NOTE ON PROVENANCE: the reference is a dashboard and contains no composer, so it does
 * not specify this control. What it does specify is the relationship, and that is what is
 * applied here - raised surface = white + hairline + shadow, recessed surface = tint.
 * Calling this "what the design says" would be overclaiming; it is the design's rule
 * applied to a control the design does not contain.
 *
 * The shadow is the token card-shadow already uses, so it follows the theme ink and is
 * visible in dark mode; off means the composer still gets the hairline, which is what
 * carries the edge at that point.
 *
 * Still an inset shadow, never a border: a border would add 2px to a control the host has
 * already sized, and this project has broken a host-sized control once by nudging its box
 * (D14). */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.CENTER}"] [data-composer-card] {
  background: var(--dsh-bento-card);
  box-shadow: inset 0 0 0 1px var(--dsh-bento-edge), var(--dsh-bento-shadow);
}
`;

    FEATURES.push({
      id: 'center-card',
      title: { en: 'Conversation card', zh: '对话区卡片' },
      about: {
        en: 'Inset the conversation column onto its own card, with the composer recessed into it.',
        zh: '把对话区收进一张卡片，输入框作为凹陷面板嵌在其中。',
      },
      order: 15,
      enabled: true,
      css: CENTER_CSS,
    });
