/**
 * Feature: card corners.
 *
 * THE DEFECT THIS FIXES, and why it is separate from the cards themselves.
 *
 * A card is painted on the column's `::after` as an inset rounded rect. The content
 * inside it is NOT painted by that pseudo-element: the host's own scroll containers
 * paint it, and they are plain rectangles running to the card's exact edges. An empty
 * conversation shows a perfect 20px corner; the moment content reaches the bottom of the
 * scroll area the rectangle wins and the corner goes square.
 *
 * Reproduced deliberately: filling the scroll body with a solid block and scrolling to
 * the end squared off both bottom corners; giving that container the card's own radius
 * restored them.
 *
 * TWO CONDITIONS ARE BOTH REQUIRED, and getting either wrong makes this a no-op:
 *
 *   1. The element must actually SCROLL. A radius on a box with `overflow: visible`
 *      paints nothing - it cannot clip what it does not clip. The first version of this
 *      rule targeted the sidebar's `listArea` wrapper, which is `visible`, and did
 *      nothing; the scroller one level in is `list`.
 *   2. The radius must match the box's OWN corners. Both scrollers reach the card's
 *      outer edge (measured: bottom 888 against a card bottom of 888), so it is the
 *      card's 20px they must follow - not the 12px inner tier, which is for controls
 *      inset from that edge.
 *
 * `overflow` is never set here. These elements already scroll; adding an overflow value
 * would change scrolling behaviour rather than painting, and on a `visible` box it would
 * create a scroll container that the host did not ask for.
 */
    const CORNERS_CSS = `
/* The conversation's scroll body: reaches all four card edges, and scrolls. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.CENTER}"] [data-conversation-scroll] {
  border-radius: var(--dsh-bento-radius);
}

/* The sidebar's row list. [class*="list"] alone matched the non-scrolling listArea
   wrapper first; this targets the scroller, proven by reading overflow on both. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.SIDEBAR}"] [class*="list"] {
  border-radius: var(--dsh-bento-radius);
}

/* The right panel's body: the same card, the same corner, when it scrolls. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.RIGHTBAR}"] [class*="tabHostBody"] {
  border-radius: var(--dsh-bento-radius);
}
`;

    FEATURES.push({
      id: 'card-corners',
      title: { en: 'Card corners', zh: '卡片圆角' },
      about: {
        en: 'Clip scrolling content to the card\u2019s rounded corners, so the bottom edge stays curved once a conversation fills it.',
        zh: '让滚动内容裁切在卡片的圆角内，会话内容填满后底边仍保持圆角。',
      },
      order: 23,
      enabled: true,
      css: CORNERS_CSS,
    });
