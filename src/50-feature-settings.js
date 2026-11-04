/**
 * Feature: the Settings dialog as a bento board.
 *
 * The host renders Settings as a floating panel with two regions: a fixed 188px
 * navigation column and a flexible content column. Both are painted the same
 * white, so the dialog reads as one flat sheet divided only by a hairline under
 * every row.
 *
 * This feature gives it the composition the rest of the theme uses: a canvas, one
 * raised card, and spacing where the host drew rules.
 *
 * IMPORTANT — the card costs no layout width.
 * The first attempt inset the content column with a margin. That narrowed it from
 * 612px to 596px, and the host's Appearance control (three cubes, `flex: 1 1
 * 180px`, `flex-wrap: wrap`) needs 3x180 + 2x8 = 556px inside a 564px row. Losing
 * 18px pushed the row to 556px of space for 556px of control at the wrong moment,
 * and "System" wrapped onto its own line. So the card is painted on a
 * zero-layout pseudo-element instead: the regions keep the exact boxes the host
 * solved, and the canvas shows through the inset.
 *
 * Anchors used, all written by the host itself (no stamping needed):
 *   [data-shortcut-modal="settings"]          the panel; the only dialog with this value
 *   > nav                                     the navigation column
 *   nav button[aria-current="true"]           the selected cell
 *   > div:has([data-slot="settings.section"]) the content column
 *   [data-slot="settings.general.item"] > *   one preference row
 *
 * Row class names are CSS-module hashes (oY77xG_row, hVGvvW_row, ...) and a new
 * one appears whenever a section is added, so rows are reached through the slot
 * anchor the host gives them, never through a class name.
 */
    const SETTINGS_CSS = `
/* The panel stops being a white sheet and becomes the canvas the regions sit on.
   Its 28px radius, prominent shadow and overflow: hidden are the host's own and
   stay untouched. */
html[${ROOT_ATTR}] [data-shortcut-modal="settings"] {
  background: var(--dsh-bento-canvas);
}

/* Navigation sits on its own card, inside the same enclosing element as the content
   card (D60).
   
   This was bare on the canvas, and the reason it was bare was wrong. The earlier note
   said "a list of destinations is not a unit of content", which justified one surface
   per region. The owner's report is the better reading: the Settings panel is a
   two-region dialog, and carding only one of the two makes the navigation read as
   left-over background rather than as a peer. The main page's sidebar is carded; the
   Settings sidebar is the same kind of object and now matches it.
   
   GEOMETRY IS COPIED, NOT INVENTED. Measured on the main page sidebar: card inset 12px
   from the column edge, radius 20px, 1px edge. The Settings panel's content card already
   uses the same inset at the nested radius (16px, because the panel is 28px). The nav
   card uses the same inset and the same nested radius, so the two cards in the dialog are
   siblings: measured top delta 0, bottom delta 0, and 24px between them.
   
   PAINTED ON ::before, z-index -1, exactly like the content card: the column keeps the
   box the host solved, so no control moves and no scrollbar appears.
   
   NO "position" HERE, DELIBERATELY. The card needs a positioned ancestor; the host
   already supplies one. Measured with the theme off: the nav is "position: relative"
   and "flex: 0 0 auto", so its 800px height comes from flex, not from anchoring.
   Declaring it ourselves was the first attempt: it changed nothing (nav stayed 188x800
   and every button stayed 160x40 at the same y), and gate 18 correctly flagged it as a
   needless claim on a host-owned element. The z-index below is what the -1 pseudo
   needs; the position comes from the host. */
html[${ROOT_ATTR}] [data-shortcut-modal="settings"] > nav {
  z-index: 0;
  /* 14px, not 12px. The card is inset 12px, so a 12px padding would leave the buttons
     flush with the card edge and the fill would touch the border. Each extra px of
     padding narrows the button by 2px, and the nav column is only 188px wide with real
     labels as long as "Archived sessions" (120px of text in a 112px box - it already
     truncates at the host's own padding).
     
     MEASURED, against this machine's ACTUAL 13 Settings tabs rather than the 6 the test
     profile has:
       pad 12 -> button 164px, 0px inside the card,  truncates "Archived sessions"
       pad 14 -> button 160px, 2px inside the card,  truncates "Archived sessions"
       pad 16 -> button 156px, 4px inside the card,  ALSO truncates "Usage Statistics"
     So 14 is the widest card margin that does not cost a second label. The 2px is enough
     because the card's own 1px border plus the button's 16px radius already separate the
     fill from the edge. */
  padding-inline: 14px;
}

html[${ROOT_ATTR}] [data-shortcut-modal="settings"] > nav::before {
  content: "";
  position: absolute;
  z-index: -1;
  inset: var(--dsh-bento-gutter);
  border-radius: var(--dsh-bento-radius-nested);
  background: var(--dsh-bento-card);
  border: 1px solid var(--dsh-bento-edge);
  pointer-events: none;
}

html[${ROOT_ATTR}] [data-shortcut-modal="settings"] > nav button {
  border-radius: var(--dsh-bento-radius-nested);
}

/* SELECTED DESTINATION: THE REFERENCE TREATMENT (D55).
 *
 * Was a white tile with an inset edge — i.e. the selected nav cell looked like a card
 * among cards, which reads as "raised" rather than "chosen". The reference does the
 * opposite: a TINT of the accent behind the label, the label itself in a darker accent,
 * and no border at all. That is what makes selection legible at a glance.
 *
 * The fill is mixed against the CANVAS, not the card, because this cell sits on the
 * canvas between the panel edge and the content card; mixing against the card would put
 * it a shade off the surface it appears to share.
 *
 * Both colours are derived tokens, so this follows the host accent per theme — #4176e6
 * in light, #7aaaff in dark — rather than pinning one theme's blue. Measured contrast of
 * ink on fill: 5.16:1 light, AA for body text.
 *
 * The label colour has to be set explicitly. The host paints its own label colour on the
 * button, so inheriting would leave dark ink on a tinted ground in light mode. */
html[${ROOT_ATTR}] [data-shortcut-modal="settings"] > nav button[aria-current="true"] {
  background: var(--dsh-bento-selected-fill-canvas);
  color: var(--dsh-bento-selected-ink);
  box-shadow: none;
}

/* SELECTION ALSO CARRIES WEIGHT (D58).
 *
 * Colour alone says which row is chosen only if the tint separates from the canvas at a
 * glance. A heavier label says it a second way, in a channel that survives a grey-scale
 * screenshot, a dim display and a colour-blind viewer. It is also what the reference does:
 * its active nav item is both tinted and stronger.
 *
 * 500, not 700. Measured before choosing: the label resolves at 400 and applying 600
 * changed the cell's box not at all (164x40 before and after), so weight is free here.
 * 500 is the lightest step that still reads as deliberately heavier beside a 400 sibling;
 * 700 would make the row compete with the dialog's own heading.
 *
 * Applied to the label, not the button. The icon beside it is a stroked SVG, which
 * font-weight cannot affect - naming the text keeps the rule honest about what it does. */
html[${ROOT_ATTR}] [data-shortcut-modal="settings"] > nav button[aria-current="true"] span {
  font-weight: 500;
}

/* The content column becomes the one raised card, painted on a pseudo-element so
   its box — and therefore every control inside it — is exactly the size the host
   solved. z-index: -1 keeps it behind the column's children while staying inside
   this stacking context, so no child needs lifting. The column is identified by
   what it contains, because it carries no class a stylesheet may name. */
html[${ROOT_ATTR}] [data-shortcut-modal="settings"] > div:has([data-slot="settings.section"]) {
  position: relative;
  z-index: 0;
}

html[${ROOT_ATTR}] [data-shortcut-modal="settings"] > div:has([data-slot="settings.section"])::before {
  content: "";
  position: absolute;
  z-index: -1;
  inset: var(--dsh-bento-gutter);
  border-radius: var(--dsh-bento-radius-nested);
  background: var(--dsh-bento-card);
  border: 1px solid var(--dsh-bento-edge);
  pointer-events: none;
}

/* Rows lose their hairline. The host draws a 1px rule under every row of the
   General section, which makes the section read as a ruled table; spacing and a
   pointer fill separate rows instead. The negative inline margin widens the row's
   hit area while the matching padding keeps every label at exactly the x it
   already had, so the fill can extend past the text without moving it.
   
   TWO kinds of row are covered, because Settings now holds both: the host's own
   rows in its sections (reached through its slot anchors) and this plugin's rows
   in its own tab (reached through the attribute the plugin writes). A row that
   only one of these matched would read as a stylesheet bug from the other side. */
/* THE FILL BLEEDS TO THE CARD EDGE; THE TEXT INSETS FROM IT (D68).
 *
 * This rule used ONE number for two jobs, and that was the congestion:
 *
 *   margin-inline: -gutter    how far the hover fill reaches  -> wants the card edge
 *   padding-inline: gutter    where the text starts            -> wants a real inset
 *
 * With both at 12px the text inset could never be anything but the gutter, so the label sat
 * 12px inside a card whose own nested corner is 16px - the first character started inside the
 * corner arc. Measured at 826 and 1600, light and dark: text inset 12 vs card radius 16, every
 * time. That is the concentric law read backwards: not "inner rounder than outer", but
 * "content closer to the edge than the edge's own curve".
 *
 * They are now separate numbers. The fill still bleeds exactly to the card edge (margin stays
 * at the gutter, so the hover state is unchanged), and the text insets by the cell inset.
 *
 * 16, NOT 20. The cap is the Appearance control, measured at both widths: 3x180 + 2x8 = 556
 * inside the row, so 16px is the largest inset that keeps the third cube on its line (18px
 * wraps "System"). It is also exactly the card's radius, which is what makes the label clear
 * the arc rather than graze it.
 *
 * THIS DOES NOT MOVE THE CARD OR THE CONTROLS' RIGHT EDGE. The row keeps its box (margin and
 * padding cancel), and the control column is right-aligned inside the same box, so only the
 * text's left edge shifts in. Measured: control right-edge distance from the card is 16 on
 * both sides, symmetric. */
html[${ROOT_ATTR}] [data-shortcut-modal="settings"] [data-slot="settings.general.item"] > *:has(*),
html[${ROOT_ATTR}] [data-shortcut-modal="settings"] [${ROW_ATTR}] {
  border-bottom: 0;
  border-radius: var(--dsh-bento-radius-nested);
  margin-inline: calc(-1 * var(--dsh-bento-gutter));
  padding-inline: var(--dsh-bento-cell-inset);
  transition: background-color var(--dsh-bento-motion) var(--dsh-bento-ease);
}

/* The plugin's own rows also carry a top hairline from their renderer; the board
   separates by spacing, so it goes. */
html[${ROOT_ATTR}] [data-shortcut-modal="settings"] [${ROW_ATTR}] {
  border-top: 0;
}

/* THE HEADER STRIP IS NOT COMPENSATED FOR THE CARD INSET (D68).
 *
 * The content column is two stacked regions: a fixed header strip (the "Open configuration
 * file" button and the close X) and the scrolling options area under it. The card is painted
 * on a pseudo-element inset 12px inside that column, so anything whose padding was written
 * against the COLUMN edge lands 12px closer to the card edge than it reads.
 *
 * Measured before this rule, at 826 and 1600, light and dark: the close button sat 2px from
 * the card's right edge and 8px from its top edge, inside a card whose corner radius is 16px.
 * The panel's tightest space, and the first one the eye reads as cramped.
 *
 * The host's own header padding is 20px / 14px / 8px / 10px, which is correct against the
 * column and wrong against the card. It is replaced with 12 (the card inset) + 16 (the cell
 * inset) on the top and right, so both controls clear the corner arc by the same amount the
 * rows now clear it horizontally.
 *
 * The bottom padding goes 8 -> 4, because the top grew by 8 and the options area below should
 * not lose a whole extra row of height to this fix. Measured: the header grows 54 -> 58px, so
 * one row still fits where it did.
 *
 * Reached as a DIRECT CHILD of the content column, with a class substring only to name it.
 * The substring is not enough on its own: walking every tab found a second element matching
 * "header" on the Built-in plugins tab ("headerEnd", inside a plugin card), so a descendant
 * match would have padded a card's inner header as if it were the dialog's own strip. The
 * direct-child combinator is what makes this rule select exactly one element on every tab -
 * verified across all 6 tabs, one match each. */
html[${ROOT_ATTR}] [data-shortcut-modal="settings"] > div:has([data-slot="settings.section"]) > [class*="header"] {
  padding: calc(var(--dsh-bento-gutter) + var(--dsh-bento-cell-inset)) calc(var(--dsh-bento-gutter) + var(--dsh-bento-cell-inset)) 4px calc(var(--dsh-bento-gutter) + var(--dsh-bento-cell-inset));
}

/* THE OPTIONS AREA IS LEFT ALONE, ON PURPOSE.
 *
 * It carries 0 / 24px / 24px from the host, and that 24 is load-bearing: the rows
 * cancel it with a -12px margin, so the row box lands exactly on the card edge (24 - 12 = 12
 * = the card inset). Changing it to the cell inset would put the row box 8px OUTSIDE the card,
 * and the hover fill would bleed onto the canvas past the card it belongs to.
 *
 * So the inset is expressed on the row (padding-inline), never on this box. Recorded because
 * "make the paddings agree" looks like the obvious tidy-up and is wrong. */

/* ACCENT SWATCHES, DARK THEME.
 *
 * A swatch shows the accent the user is choosing. Each palette entry carries two hex values -
 * one per theme - because the host's own accent is #4176e6 in light and #7aaaff in dark: the
 * same identity, lightened for a dark ground. Showing the light value on a dark card would
 * misrepresent what the user is about to get.
 *
 * The renderer writes BOTH values on the swatch as custom properties rather than one inline
 * background, because an inline style cannot express "only when the host marks dark". This rule
 * then picks one. That is the whole mechanism: inline values are data, the stylesheet decides.
 *
 * The dark condition is the host's own 'data-ds-dark-theme' marker, not 'prefers-color-scheme':
 * the user can force either theme regardless of the OS, and the media query would then paint
 * the wrong swatch exactly when the two disagree. */
html[${ROOT_ATTR}] [data-shortcut-modal="settings"] [${ROW_ATTR}] [data-swatch] {
  background: var(--swatch-light);
}

html[${ROOT_ATTR}] body[data-ds-dark-theme] [data-shortcut-modal="settings"] [${ROW_ATTR}] [data-swatch] {
  background: var(--swatch-dark);
}

/* TRUE CIRCLES, WHICH NEED AN EXPLICIT EXPONENT.
 *
 * The host sets 'corner-shape: superellipse(1.5)' and the property INHERITS, so a 999px radius
 * draws a squircle. Measured in this build, a border-radius: 50% chip renders as:
 *
 *   corner-shape              result
 *   (inherited 1.5)           over-rounded square - the bug
 *   round / superellipse(1)   CIRCLE
 *   superellipse(1.5)         over-rounded square
 *   superellipse(2)..(4)      progressively squarer
 *   superellipse(0) / bevel   a DIAMOND at this radius
 *
 * So 'round' is not a keyword this build honours distinctly - it computes to superellipse(1),
 * and 1 is the exponent that draws the circle. Written as the explicit exponent rather than as
 * 'round' so the intent cannot be lost to a keyword alias.
 *
 * It cannot be set from the renderer's inline style: React drops unknown CSS properties, and the
 * span kept inheriting 1.5 from its parent button. Measured, then moved here. */
html[${ROOT_ATTR}] [data-shortcut-modal="settings"] [${ROW_ATTR}] [data-swatch],
html[${ROOT_ATTR}] [data-shortcut-modal="settings"] [${ROW_ATTR}] [role="radio"],
html[${ROOT_ATTR}] [data-shortcut-modal="settings"] [${ROW_ATTR}] input[type="color"] {
  corner-shape: superellipse(1);
  border-radius: 50%;
}

/* The native colour input paints its own square swatch inside the control, so rounding the
 * input alone leaves a square inside a circle. These strip the browser's chrome so the round
 * shape is what shows. */
html[${ROOT_ATTR}] [data-shortcut-modal="settings"] [${ROW_ATTR}] input[type="color"] {
  appearance: none;
  -webkit-appearance: none;
  border: 0;
  padding: 0;
  overflow: hidden;
  background: transparent;
}

html[${ROOT_ATTR}] [data-shortcut-modal="settings"] [${ROW_ATTR}] input[type="color"]::-webkit-color-swatch-wrapper {
  padding: 0;
}

html[${ROOT_ATTR}] [data-shortcut-modal="settings"] [${ROW_ATTR}] input[type="color"]::-webkit-color-swatch {
  border: 1px solid var(--dsw-alias-border-l2);
  border-radius: 50%;
  corner-shape: superellipse(1);
}

/* The version footer holds no preference — it is one line of text, not a row with
   a control — so it keeps the host's flat treatment and gains no hover fill. */
html[${ROOT_ATTR}] [data-shortcut-modal="settings"] [data-slot="settings.general.item"] > *:has(*):hover,
html[${ROOT_ATTR}] [data-shortcut-modal="settings"] [${ROW_ATTR}]:hover {
  background: var(--dsh-bento-hover);
}

/* KEYBOARD PARITY.
 *
 * This board gives a row a fill on hover, and a row that reacts to a pointer but not
 * to the keyboard is a keyboard user being told less than a mouse user. Measured
 * before this rule: a hovered row computed the hover fill, while the same row under
 * keyboard focus stayed transparent — the only indication being the host's ring,
 * which is drawn around the 36x20 switch, not around the row.
 *
 * :has(:focus-visible) rather than :focus-within, deliberately. :focus-within also
 * matches after a MOUSE click on the switch, so the row would stay filled after a
 * click until focus moved elsewhere — a fill that no longer means "focus". Requiring
 * a focus-visible descendant keeps the fill tied to keyboard navigation, which is
 * what hover means for the pointer.
 *
 * This is the same pairing as the Plugins page rows (48-feature-pages.js): fill on
 * hover, fill on keyboard focus, ring supplied by the host. */
html[${ROOT_ATTR}] [data-shortcut-modal="settings"] [data-slot="settings.general.item"] > *:has(*):has(:focus-visible),
html[${ROOT_ATTR}] [data-shortcut-modal="settings"] [${ROW_ATTR}]:has(:focus-visible) {
  background: var(--dsh-bento-hover);
}

/* Reduced motion: the fill appears at once rather than fading in. */
@media (prefers-reduced-motion: reduce) {
  html[${ROOT_ATTR}] [data-shortcut-modal="settings"] [data-slot="settings.general.item"] > *:has(*),
  html[${ROOT_ATTR}] [data-shortcut-modal="settings"] [${ROW_ATTR}] {
    transition: none;
  }
}

/* INNER CARDS BECOME TILES ON THE BOARD.
 *
 * The content column is already the one raised card. Three of the host's sections then
 * draw their OWN bordered white cards inside it — boxes inside a box, which is the exact
 * language this theme exists to remove. Measured before this rule: every tab except
 * General rendered nested cards, all with radius 20px, 1px border and white fill:
 *
 *   Models            2 rows   564x54    ul{flex column, gap 8}
 *   Built-in plugins  29 cards 277x84    ul{grid 2x 277px, gap 10}
 *   Agent presets     4 cards  276x191   ul{grid 2x 276px, gap 12}
 *
 * REACHED STRUCTURALLY, NOT BY CLASS. The three renderers live in different bundles and
 * their class names are CSS-module hashes that differ per renderer (zGbnIq_, qSYn7G_,
 * rtSEdW_) and change when a section is added. What all 35 share is the shape: a list
 * item inside a settings section. That is the anchor, and it needs no stamping.
 *
 * FLATTEN THE PAINT, KEEP THE LAYOUT. The border and fill go; the box does not move.
 * Nothing here sets display, grid or width, so the 2-up grids stay 2-up — 29 plugins in
 * one column would be a worse answer than a box, not a more bento one. Keeping the boxes
 * also means the host's own box-sizing budget is untouched (same reason as ::before on
 * the content column): border-box means removing a border grows the content, never the
 * cell, so the grid cannot reflow.
 *
 * Radius drops to the inner token: a 20px corner on a tile that now sits on a card of
 * the same 20px reads as a second, competing container. */
html[${ROOT_ATTR}] [data-shortcut-modal="settings"] [data-slot="settings.section"] ul > li {
  border: 0;
  background: transparent;
  border-radius: var(--dsh-bento-radius-nested);
  transition: background-color var(--dsh-bento-motion) var(--dsh-bento-ease);
}

/* Pointer and keyboard get the same fill, for the same reason as the General rows: a
   tile that answers the mouse but not the keyboard tells a keyboard user less. These
   are focusable through their inner button, so :has(:focus-visible) is the check. */
html[${ROOT_ATTR}] [data-shortcut-modal="settings"] [data-slot="settings.section"] ul > li:hover,
html[${ROOT_ATTR}] [data-shortcut-modal="settings"] [data-slot="settings.section"] ul > li:has(:focus-visible) {
  background: var(--dsh-bento-hover);
}

/* TILES SIT ON THE BOARD'S GRID, NOT INSIDE AN INVISIBLE BOX.
 *
 * Removing a card's border and fill leaves its PADDING behind, and padding with no box
 * around it does not read as breathing room — it reads as misalignment. Measured on
 * Models before this rule: every row kept padding: 12px 14px, so its label sat 14px
 * right of the section heading with a 54px-tall empty band around it. The row was still
 * laid out as a card that no longer exists.
 *
 * The trim is the one already used for the General rows, and for the same reason: a
 * negative inline margin plus a matching padding lets the hover fill bleed to the edge
 * of the card while every label stays at exactly the x the host put it. The label does
 * not move; only the fill's reach changes.
 *
 * :has(> *) narrows this to rows that wrap content. A bare text row would have its
 * glyphs shifted by the negative margin and nothing to fill. */
html[${ROOT_ATTR}] [data-shortcut-modal="settings"] [data-slot="settings.section"] ul > li:has(> *) {
  padding-inline: var(--dsh-bento-gutter);
  margin-inline: calc(-1 * var(--dsh-bento-gutter));
}

/* HOST CONTROLS INSIDE A ROW MUST NOT BE ROUNDER THAN THE ROW.
 *
 * The Appearance control is three 183x84 tiles with a 20px radius, sitting inside one of
 * our 16px rows. Measured: 20px inside 16px, a 4px overshoot on the largest, most
 * visible control in the tab - the exact defect this turn set out to remove, one level
 * down from the panel boundary.
 *
 * These are host-owned surfaces, so the fix is deliberately narrow: cap the radius at
 * the row's own curve with min(), rather than restyling a control the host designed.
 * min() keeps the host's 20px wherever the row is wider or absent, and only intervenes
 * where our own 16px row would otherwise be out-curved by its contents. */
html[${ROOT_ATTR}] [data-shortcut-modal="settings"] [data-slot="settings.general.item"] > *:has(*) [class*="themeCube"],
html[${ROOT_ATTR}] [data-shortcut-modal="settings"] [${ROW_ATTR}] [class*="themeCube"] {
  border-radius: min(20px, var(--dsh-bento-radius-nested));
}

/* THE CLICKABLE SURFACE INSIDE A TILE MATCHES THE TILE'S OWN CURVE.
 *
 * A curve rounder than its container does not read as nested; it reads as a bubble
 * trying to escape. Measured: Agent preset tiles are 16px and the clickable surface
 * filling each one was 20px - rounder than the tile holding it, the two corners crossing
 * at every edge. Same class of defect at the panel boundary, one level down.
 *
 * SCOPE, and this is the part the first attempt got wrong. This rule must reach ONLY
 * the surface that FILLS the tile, never every child. ul > li > * looks equivalent and
 * is not: it also hit elements inset 12px inside the tile, where inheriting the tile's
 * 16px makes them rounder than a 4px budget allows. Measured on General: 12 false
 * corrections, including 12px hit-area wrappers and 20px theme precondition cubes.
 *
 * So it is scoped to what a preset/plugin row actually fills with: the block-level
 * clickable child. Everything inset keeps the smaller 12px inner tier it already has,
 * because a control 12px inside a 16px tile should be about 4px, not 16.
 *
 * inherit rather than a literal: the value has one owner (the tile), so the two cannot
 * drift. D45 had to be corrected by hand precisely because a radius was written twice. */
html[${ROOT_ATTR}] [data-shortcut-modal="settings"] [data-slot="settings.section"] ul > li > button,
html[${ROOT_ATTR}] [data-shortcut-modal="settings"] [data-slot="settings.section"] ul > li > a {
  border-radius: inherit;
}

/* SELECTION MUST SURVIVE THE FLATTENING.
 *
 * Agent presets marks the chosen mode with a border and a tinted fill — the two things
 * this rule removes. Losing it would leave "which mode is the default" unanswerable, so
 * the state is re-expressed with the same accent-tint treatment as the Settings
 * destination above (D55). Reached through aria-pressed because that is the state, and
 * it is stable across renderers rather than tied to a hashed class name.
 *
 * Mixed against the CARD here, because these tiles sit on the content card — the same
 * mix used on the canvas would read a shade too light against it. */
html[${ROOT_ATTR}] [data-shortcut-modal="settings"] [data-slot="settings.section"] ul > li:has([aria-pressed="true"]) {
  background: var(--dsh-bento-selected-fill);
  box-shadow: none;
  color: var(--dsh-bento-selected-ink);
}

/* The :hover fill must not win over a selected tile, or hovering the default mode would
   make it look unselected. Declared after, and scoped to exclude the selected case. */
html[${ROOT_ATTR}] [data-shortcut-modal="settings"] [data-slot="settings.section"] ul > li:hover:not(:has([aria-pressed="true"])) {
  background: var(--dsh-bento-hover);
}

@media (prefers-reduced-motion: reduce) {
  html[${ROOT_ATTR}] [data-shortcut-modal="settings"] [data-slot="settings.section"] ul > li {
    transition: none;
  }
}

/* THE PRESET-CARD HEADER WRAPS INSTEAD OF TRUNCATING (D66).
 *
 * Reported as "the mode selectors are overlapping in the settings". Nothing overlaps - measured,
 * no pair of header elements intersects. What happens is that the card TITLE is ellipsised to
 * "Standar..." because the row runs out of width.
 *
 * The host's header is one flex row: [ name | tag ] in a cardIdentity span, then a cardId
 * code element. The identity is flex: 1, so it gets whatever is left after the id, and the tag
 * is a sibling that does not shrink. Measured inside one card at 1600px:
 *
 *   identity available   184px
 *   name needs           111px  ("Standard mode")
 *   gap                    6px
 *   tag needs            105px  ("New task default")
 *   total needed         222px   -> 38px short, so the name ellipsises
 *
 * THIS IS NOT THEME-CAUSED, and the measurement matters because it changes the fix. With the
 * theme switched off the name is STILL truncated (75px of 104px needed): the host's own layout
 * does this. The theme merely widens the card from 276 to 300px, which is not enough to close a
 * 38px gap. So this is a host defect the theme chooses to correct, not one it introduced - and
 * the theme's correction must not depend on its own padding.
 *
 * WIDENING THE WINDOW DOES NOT HELP. The host's grid is
 * repeat(auto-fill, minmax(268px, 1fr)), so a card is ~276-300px at any viewport. Measured at
 * 2200px: still 184px for the identity, still truncated.
 *
 * THE FIX LETS THE ROW WRAP. flex-wrap: wrap puts the tag on its own line when the row cannot
 * hold all three, so the name takes the full width. Measured: name 111 of 111 needed, no
 * ellipsis, and only the two cards that carry a tag grow (189 -> 212px); the two without one are
 * untouched. The alternative - letting the tag shrink and ellipsise - keeps one line but starts
 * hiding tag text, which is the same defect moved rather than fixed.
 *
 * row-gap: 4px is the wrap's only new spacing: the host's existing gap: 6px becomes the
 * column gap, and a wrapped row needs its own. 4 rather than 6 so the tag sits closer to the
 * title it labels than to the description below. */
html[${ROOT_ATTR}] [data-shortcut-modal="settings"] [data-slot="settings.section"] ul > li [class*="cardIdentity"] {
  flex-wrap: wrap;
  row-gap: 4px;
}
`;

    FEATURES.push({
      id: 'settings-bento',
      title: { en: 'Settings board', zh: '设置面板' },
      about: {
        en: 'Lay Settings out as a bento board: navigation on the canvas, content on one card, no row rules.',
        zh: '把设置页排成便当式布局：导航放在画布上，内容收进一张卡片，去掉逐行分隔线。',
      },
      order: 30,
      enabled: true,
      css: SETTINGS_CSS,
    });

