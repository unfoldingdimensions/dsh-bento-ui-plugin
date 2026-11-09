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
  /* The card pad is padding on the column, so the track width the host solved — and the
     drag handle at its boundary — is untouched. It is the card distance token, not the
     inside-a-card rhythm the gutter still carries (D78). */
  padding: var(--dsh-bento-card-pad);
  box-sizing: border-box;
  /* The containing block for the card, and no fill of its own. */
  position: relative;
  background: transparent;
  /* A stacking context, so the card at z-index -1 stays inside this column. */
  isolation: isolate;
}

html[${ROOT_ATTR}] [${PART_ATTR}="${PART.RIGHTBAR}"]::after {
  content: "";
  position: absolute;
  inset: var(--dsh-bento-card-pad);
  border-radius: var(--dsh-bento-radius);
  background: var(--dsh-bento-card);
  border: 1px solid var(--dsh-bento-edge);
  pointer-events: none;
  /* PAINT ORDER. Same mechanism as the other two columns (47-feature-center.js):
     behind the column's content by z-index, not by lifting the content. This column
     never had the lift in the first place, which is why it kept working while the
     conversation lost its text. */
  z-index: -1;
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
   radius matches the card so the pane's own content sits inside the rounding.
 *
 * THE BORDER-LEFT IS THE DIVIDER THE CARD WAS MEANT TO REPLACE.
 * The host draws border-left: 1px solid rgba(0, 0, 0, 0.16) on this element — a rule
 * separating the docked pane from the conversation. Once the column becomes its own
 * inset card, that hairline is stranded 12px outside the card, floating on the canvas
 * between the two surfaces. Measured: it is the only element in the whole shell painting
 * a vertical edge, so it reads as a stray line rather than an edge of anything.
 *
 * The card's own border is the separation now, so the host's goes. The sidebar and
 * centre columns already have zero borders - the right column just had one left over.
 *
 * WHY THE SELECTOR IS DOUBLED. The host declares this border with five compound
 * selectors:
 *   ._tabCell[data-dockkit-host="dock"][data-dockkit-column="0"] > ._tabHost_x
 * which outranks html[ROOT] [part="rightbar"] [class*="tabHost"] (3 selectors) no matter
 * the source order. Measured: border: 0 lost and the line stayed. Repeating the part
 * attribute raises this rule above the host's without !important. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.RIGHTBAR}"][${PART_ATTR}] [class*="tabHost"] {
  background: transparent;
  border: 0;
  border-radius: var(--dsh-bento-radius-inner);
  overflow: hidden;
}

/* KEEP THE PANEL'S OWN CHROME INSIDE THE CARD.
 *
 * The panel root is host-positioned absolutely and spans the WHOLE column (measured
 * x 880..1600, y 0..900), while this feature's card is painted INSET by the gutter
 * (892..1588, 12..888). The card therefore sits inside the panel, not the other way
 * round - so the panel's own chrome overhangs it on all four sides and the card's
 * rounded corners clip through it.
 *
 * Measured before this rule:
 *   right-hand buttons ended at x 1594 against a card edge of 1588  -> 6px outside
 *   header buttons sat at y 10 against a card top of 12            -> 2px above
 * and the corner arcs cut through them. That is the "text touches the border" report:
 * near the corners the chrome and the stroke overlap.
 *
 * THE FIX IS PADDING ON THE PANE, NOT ON THE PANEL.
 * Padding the panel would move its box, and its height depends on being edge-anchored
 * (D50) - measured: margin on the panel dropped it from 900px to 876px. Padding inside
 * the tab host keeps the panel exactly where the host put it and only insets the
 * contents, so the header, the tab strip and everything below clear the card.
 *
 * + 1px because the card's 1px border is drawn OUTSIDE its own radius: the stroke's
 * inner edge sits at card-pad + 1, so clearing the card pad alone still grazes it.
 *
 * The pad it follows is --dsh-bento-card-pad (D78), the same distance the card itself is
 * inset by, so this stays correct if the card distance changes: the pane's content must
 * always start exactly where the card's edge does, plus the border.
 *
 * Verified in both themes: panel still 900px, 0 text boxes and 0 buttons outside the
 * rounded boundary, down from 3 clipped header buttons. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.RIGHTBAR}"] [class*="tabHost"] {
  padding: calc(var(--dsh-bento-card-pad) + 1px);
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
