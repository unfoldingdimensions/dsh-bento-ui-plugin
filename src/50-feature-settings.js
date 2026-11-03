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

/* Navigation sits directly on the canvas rather than in a card of its own: a list
   of destinations is not a unit of content, and one surface per region is what
   keeps the composition from reading as boxes inside boxes. */
html[${ROOT_ATTR}] [data-shortcut-modal="settings"] > nav {
  padding-inline: var(--dsh-bento-gutter);
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
html[${ROOT_ATTR}] [data-shortcut-modal="settings"] [data-slot="settings.general.item"] > *:has(*),
html[${ROOT_ATTR}] [data-shortcut-modal="settings"] [${ROW_ATTR}] {
  border-bottom: 0;
  border-radius: var(--dsh-bento-radius-nested);
  margin-inline: calc(-1 * var(--dsh-bento-gutter));
  padding-inline: var(--dsh-bento-gutter);
  transition: background-color var(--dsh-bento-motion) var(--dsh-bento-ease);
}

/* The plugin's own rows also carry a top hairline from their renderer; the board
   separates by spacing, so it goes. */
html[${ROOT_ATTR}] [data-shortcut-modal="settings"] [${ROW_ATTR}] {
  border-top: 0;
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
