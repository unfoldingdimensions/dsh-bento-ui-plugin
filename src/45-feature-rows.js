/**
 * Feature: sidebar rows as tiles.
 *
 * The sidebar list renders every Session row as a 32px flex row carrying
 * `data-row-key="session:<id>"`, and every Workspace heading as a 34px row with
 * `data-row-key="workspace:<key>"`. Both are stable semantic hooks the host
 * writes itself, so nothing needs stamping here.
 *
 * The host already expresses selection as a background on `:hover` and on the
 * selected row, so tiles keep that behaviour untouched and add only geometry:
 * a rounding, a hairline gap between rows, and one edge on the row the pointer
 * is over. An idle list therefore stays quiet — no rule per row — which is the
 * difference between a bento stack and a ruled grid.
 *
 * THE NAV ROWS TOO. The sidebar also renders top-level destinations (Plugins, MCP
 * connectors) as buttons, and they sat at the host's own 12px radius with no edge
 * while the session tiles below them were 14px with one. Two row styles stacked in
 * one column. Measured before the fix:
 *
 *   nav row      button, 12px radius, no border, 36px tall
 *   session row  div,    14px radius, 1px border, 34px tall
 *
 * They are addressed as `[class*="panelList"] > button`: proven to match exactly
 * the 2 destination buttons, and nothing else in the sidebar. A plain
 * `[data-sidebar] button` would have matched 36 and hit the brand, the collapse
 * toggle, the New Session button and the Settings trigger.
 */
    const ROWS_CSS = `
/* Leaf session rows become tiles. The Workspace row above them is a heading, so
   it keeps the flat list treatment and only gains breathing room. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.SIDEBAR}"] [data-row-key^="session:"] {
  border-radius: var(--dsh-bento-radius-inner);
  border: 1px solid transparent;
  /* One pixel above and below each tile. These rows are flex children, so the
     margin adds to the row's own height rather than collapsing away. */
  margin-block: 1px;
  transition:
    border-color var(--dsh-bento-motion) var(--dsh-bento-ease),
    background-color var(--dsh-bento-motion) var(--dsh-bento-ease);
}

/* The pointer row states its edge; the host supplies the fill underneath. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.SIDEBAR}"] [data-row-key^="session:"]:hover {
  border-color: var(--dsh-bento-edge);
}

/* Keyboard focus keeps the host's own focus ring — this rule only adds the
   edge, so the accessible focus indicator is never traded for a border. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.SIDEBAR}"] [data-row-key^="session:"]:focus-visible {
  border-color: var(--dsw-alias-brand-primary);
}

/* SESSION AGE BECOMES A PILL (D69).
 *
 * The reference shows each session's age in a rounded chip rather than as loose grey text, and
 * the host already renders the data: measured, every session row carries a SPAN whose class
 * ends in "_time" holding "3min" / "7h" / "8d" / "14d" at 10px.
 *
 * So this is a paint change, not a new element. Addressed by class SUBSTRING ("_time"), because
 * the full name is a per-build hash (YDXeBa_time) - the same technique the Settings board uses
 * for "cubeRow", and the same caveat: re-verify the match count after a harness upgrade.
 *
 * Measured 5 of 5 session rows match, and 0 other elements in the sidebar do. A plain
 * [class*="time"] would have been the sloppier version of the same idea and is not used.
 *
 * The padding has to be paid for. A 10px glyph with 1px/6px of chip padding is 4px wider than
 * the bare text, and the row is a flex line whose title already truncates - so the chip steals
 * from the title. 2px/6px keeps the growth small while still reading as a chip; measured, the
 * longest title in the column ("Debug QR Cloudflare host error") still truncates exactly as it
 * did before, because it was already ellipsised and the chip is not the binding constraint.
 *
 * line-height: 1 is not cosmetic: the span inherits an 18px line box, which inside a 36px row
 * makes the chip 20px tall and visibly taller than the reference's. Setting it to the font size
 * gives a ~14px chip that sits centred. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.SIDEBAR}"] [data-row-key^="session:"] [class*="_time"] {
  border-radius: var(--dsh-bento-radius-pill);
  padding: 2px 6px;
  line-height: 1;
  background: var(--dsh-bento-hover);
  /* The chip must not be the reason a title wraps. */
  flex: none;
}

/* On the SELECTED row the chip's neutral fill disappears into the accent tint it now sits on,
   so it inverts to the card tone, which is the only surface that stays distinct against the
   tint in both themes. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.SIDEBAR}"] [data-row-key^="session:"][aria-selected="true"] [class*="_time"] {
  background: var(--dsh-bento-card);
  color: var(--dsh-bento-selected-ink);
}

/* A Workspace heading separates groups rather than being one, so it has no
   border; the extra top margin is what makes the group break readable. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.SIDEBAR}"] [data-row-key^="workspace:"] {
  margin-block-start: var(--dsh-bento-gutter);
}

/* The two top-level destinations match the session tiles instead of sitting at
   the host's 12px with no edge. The border is declared transparent so the row's
   box does not change when a state appears - a 1px addition here would shift the
   36px button and every row below it. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.SIDEBAR}"] [class*="panelList"] > button {
  border-radius: var(--dsh-bento-radius-inner);
  border: 1px solid transparent;
  margin-block: 1px;
  transition:
    border-color var(--dsh-bento-motion) var(--dsh-bento-ease),
    background-color var(--dsh-bento-motion) var(--dsh-bento-ease);
}

/* POINTER STATE IS A FILL, NOT AN EDGE (D83).
 *
 * The theme gave every destination button an edge on hover, to match the session tiles
 * below it. Measured against the reference, that is the wrong reading: the reference marks
 * a nav row's pointer state with a FILL and never with a border - its nav rows carry no
 * border in any state - and here the edge made a hovered destination look momentarily
 * selected, in a column where "selected" is already a tinted fill with an accent label.
 *
 * So the pointer answers with the theme's neutral hover fill and no edge. The border stays
 * DECLARED transparent rather than deleted: removing the declaration would shrink the
 * button by 2px and shift every row below it, which is why it was transparent to begin
 * with.
 *
 * Keyboard focus gets the same fill, for the same reason as the Settings rows: a control
 * that answers the mouse but not the keyboard tells a keyboard user less. The host's own
 * focus ring is untouched, so the accessible indicator is still there.
 *
 * The SESSION rows keep their edge. They are the list's contents rather than the shell's
 * navigation, and a tile there reads as one row of a stack. That difference is the point:
 * navigation answers with a fill, contents answer with a tile. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.SIDEBAR}"] [class*="panelList"] > button:hover,
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.SIDEBAR}"] [class*="panelList"] > button:has(:focus-visible),
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.SIDEBAR}"] [class*="panelList"] > button:focus-visible {
  background: var(--dsh-bento-hover);
  border-color: transparent;
}

/* Reduced motion: the border swap is instant rather than animated. */
/* SELECTED ROW: THE REFERENCE TREATMENT (D55).
 *
 * The host marks the active session / destination with a neutral grey
 * (rgba(38,49,72,0.06)). That is a state, but it says nothing about WHICH thing is
 * chosen beyond being slightly darker than its neighbours - and on a grey canvas it
 * is easy to miss entirely.
 *
 * The reference does it with colour: a tint of the accent behind the label, the
 * label in a darker accent, no border. That is legible at a glance and is the one
 * place in the shell where an accent is the right answer, because it is the only
 * place the interface is telling you where you are.
 *
 * Both colours are derived from the host accent, so light and dark each get their
 * own correct tint (#4176e6 / #7aaaff) without a second declaration.
 *
 * THE TINT IS MIXED AGAINST THE CARD, NOT THE CANVAS (D76) - a correction. This rule
 * used --dsh-bento-selected-fill-canvas, which mixes the accent over the canvas tone,
 * and it was right while these rows sat directly on the canvas. sidebar-card and
 * row-tiles then put them on a WHITE card, and the mix was never updated: measured, the
 * tint resolved to color(srgb 0.842 0.877 0.943) - the canvas mix - while the surface
 * painted behind the row is rgb(255,255,255), so the selected row was 4.3 RGB units off
 * the surface it is supposed to be a tint OF, and read a shade greyer than the design.
 * The card mix resolves to color(srgb 0.911 0.936 0.988) on the same surface.
 *
 * It is also the better choice on contrast, measured in both themes by painting both
 * mixes and the ink and computing WCAG ratios:
 *
 *   theme   ink on canvas-mix   ink on card-mix
 *   light        5.56:1              6.40:1
 *   dark         4.60:1              6.48:1
 *
 * Dark mode was the tight case for D55's 65% ink ratio (4.60 against an AA floor of
 * 4.5). The card mix lifts it to 6.48, so the correction buys margin rather than
 * spending it - which is why the ink ratio itself is left at 65%.
 *
 * THE DESTINATION BUTTONS ARE ADDRESSED BY BOTH aria-current VALUES. Measured on this
 * host: the selected sidebar destination carries aria-current="page", not "true". The
 * rule below asked for "true", matched 0 elements, and the selected destination kept
 * the host's neutral grey while the session rows beside it were tinted - two different
 * selected states 30px apart. "true" is kept because it is the value the earlier host
 * wrote and costs nothing to accept; "page" is the one that fires now.
 *
 * The host's hover fill is left alone. A selected row that is also hovered keeps
 * this tint, because this rule is declared after the host's hover rule - verified
 * by reading the computed colour in both states, not assumed from source order.
 * Addressed through aria-selected / aria-current, which the host sets on the active
 * row, so this does not depend on a hashed class name. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.SIDEBAR}"] [data-row-key^="session:"][aria-selected="true"],
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.SIDEBAR}"] [class*="panelList"] > button[aria-current="true"],
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.SIDEBAR}"] [class*="panelList"] > button[aria-current="page"],
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.SIDEBAR}"] [class*="panelList"] > button[aria-selected="true"] {
  background: var(--dsh-bento-selected-fill);
  color: var(--dsh-bento-selected-ink);
  border-color: transparent;
}

/* SELECTION ALSO CARRIES WEIGHT (D77).
 *
 * D58 established the rule for the Settings navigation - "colour alone says which row is
 * chosen only if the tint separates at a glance" - and set it to 500 there. The same rule
 * was never applied to the SIDEBAR, so the shell had two answers for one question: the
 * Settings destination was 500, every session row was 400.
 *
 * 600, not 500, and not 700. The reference's weight scale is 400 / 500 / 600 / 700 and its
 * section titles are 600, so 600 is the step that exists in both places. 700 competes with
 * the pane headings; 500 is the value that made the Settings nav look under-committed.
 *
 * MEASURED, because weight on a truncating row is not free: the longest title in the column
 * ("Debug QR Cloudflare host error", 166px box) needs 209px at 400, 212px at 600 and 214px
 * at 700. It already ellipsises at 400, so 600 costs it 3px of an already-clipped string and
 * changes no row box (240x32 at every weight). A title that FITS at 400 still fits at 600:
 * the selected row's own title measured 193px of 193px available, and the idle control
 * ("Bento UI plugin") is untouched at 400 because this rule is scoped to the selected row.
 *
 * Applied to the label, not the row, for the session row: the row also contains the age
 * chip and the glyph slot, and weight on the row would be inherited by the chip's text too.
 * Measured: the chip stays at 400. The destination button is addressed the same way - by
 * its label's class substring ("panelTitle"), not by "the first span" - because the first
 * span in that button is the GLYPH, and a positional selector would have bolded the icon
 * slot instead of the text. Verified: 1 match per selected destination button, and the
 * glyph span stays at 400. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.SIDEBAR}"] [data-row-key^="session:"][aria-selected="true"] [class*="_title"],
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.SIDEBAR}"] [class*="panelList"] > button[aria-current="true"] [class*="panelTitle"],
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.SIDEBAR}"] [class*="panelList"] > button[aria-current="page"] [class*="panelTitle"] {
  font-weight: 600;
}

/* Reduced motion: the border swap is instant rather than animated. */
@media (prefers-reduced-motion: reduce) {
  html[${ROOT_ATTR}] [${PART_ATTR}="${PART.SIDEBAR}"] [data-row-key^="session:"],
  html[${ROOT_ATTR}] [${PART_ATTR}="${PART.SIDEBAR}"] [class*="panelList"] > button {
    transition: none;
  }
}
`;

    FEATURES.push({
      id: 'row-tiles',
      title: { en: 'Sidebar tiles', zh: '侧栏瓦片' },
      about: {
        en: 'Give sidebar rows their own rounded edge and spacing instead of a flat list.',
        zh: '让侧栏各行拥有独立的圆角与间距，而不是一张平铺的列表。',
      },
      order: 20,
      enabled: true,
      css: ROWS_CSS,
    });
