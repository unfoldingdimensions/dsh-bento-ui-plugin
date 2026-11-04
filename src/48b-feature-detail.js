/**
 * Feature: the plugin detail page as a bento board (D69).
 *
 * The Plugins page has two levels. The LIST is a column of cards. Clicking a card's TITLE (not
 * its body - that distinction cost an hour, see L95) opens a detail page for that plugin, and
 * that page is where the reference's composition belongs: a hero, then a board of tiles.
 *
 * WHAT THE HOST RENDERS, measured on the live detail page (all class names are per-build hashes,
 * so every rule below reaches them by SUBSTRING, never by full name):
 *
 *   section._page                  flex column, gap 32, 1296 wide, pad 0 48px 48px
 *     div._detail                  flex column, NO gap, 960 wide  <- the hero's real container
 *       div._detailTop             crumb + head (icon, actions)
 *       div._detailMain            titleRow (h3 + version tag), name, desc
 *       div._detailSections        flex column gap 32  -> becomes the board
 *         section._detailSection   head (title + count) + rows
 *
 * Two structural traps, both measured rather than assumed:
 *
 *   1. [class*="_detailSection"] ALSO MATCHES "_detailSections", because the latter contains the
 *      former. A rule written that way hits both the board and its children, and the board would
 *      get a cell's padding. The board is addressed as "_detailSections" and the section as a
 *      DIRECT CHILD of it, which is unambiguous.
 *   2. [class*="_row "] with a trailing space matched 0 elements - the host's row class is
 *      "X_2TxG_row" with nothing after it in the class list. The UL wrapper ("_rows") is the
 *      reliable anchor instead, so rows are reached through "_rows > *".
 *
 * SCOPE. Only the detail page. The list page is untouched - it already has its own tile
 * treatment from page-rows, and a grid there would reflow every card.
 */
    const DETAIL_CSS = `
/* THE HERO BECOMES A RAISED INSET PANEL (D69).
 *
 * THE PANEL HAS TO COVER TWO SIBLINGS, AND THAT IS THE WHOLE TRICK.
 *
 * The host does not render the hero as one box. It renders:
 *
 *   div._detail              the container (flex column, no gap)
 *     div._detailTop         crumb + head: the icon and the actions   <- one sibling
 *     div._detailMain        title, tags, package name, description   <- the next sibling
 *     div._detailSections    the board
 *
 * The first draft painted only _detailTop. Every computed value was right - radius 16,
 * background set, accent border set - and the RESULT was wrong: a small panel holding an icon
 * and a switch, with the plugin's own name floating underneath it, outside the box. The numbers
 * could not see it; the screenshot could.
 *
 * So the panel is painted on _detail instead, and the two children become its content. _detail
 * is selected with :has(> _detailSections) so the rule cannot leak onto any other _detail
 * element the host may add elsewhere.
 *
 * THE WIDTH MUST NOT GROW, AND PADDING ALONE DOES NOT ENSURE THAT. _detail is 960 wide inside a
 * page padded 0 48px 48px. A negative inline margin pushes the panel 40px past its column - the
 * first attempt did exactly that (1000px in a 960px column, clipped by the page). Adding padding
 * WITHOUT box-sizing does the same thing by a different route: measured 1002px, because the
 * host's own reset does not apply border-box to this element. So the panel declares
 * box-sizing explicitly; the padding then comes out of the 960 rather than adding to it.
 *
 * THE RADIUS IS 16. The strict concentric derivation is 24 (page card) - 8 (panel inset) = 16,
 * and an earlier draft used 18 on the reasoning that 16 looked tight at the corners. That was an
 * impression with nothing behind it: the panel sits 20px inside the page, so the tight bound for
 * this inset is 24 - 20 = 4 and 16 is comfortably inside the correct range. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.CENTER}"] [class*="_detail"]:has(> [class*="_detailSections"]) {
  box-sizing: border-box;
  padding: 20px;
  border-radius: var(--dsh-bento-radius-nested);
  background: var(--dsh-bento-card);
  border: 1px solid var(--dsh-bento-accent-edge);
}

/* The top strip no longer carries its own padding now that the panel owns the inset. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.CENTER}"] [class*="_detail"]:has(> [class*="_detailSections"]) > [class*="_detailTop"] {
  padding: 0;
}

/* The title block keeps the panel's rhythm: 16px under the icon row, 20px above the board.
   The host's own 20px separation was a bottom margin on the top strip, which is now zero. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.CENTER}"] [class*="_detail"]:has(> [class*="_detailSections"]) > [class*="_detailMain"] {
  margin-block: 16px 20px;
}

/* THE CRUMB BECOMES A PILL.
 *
 * The host renders it as a bare text button with a chevron: measured 960x15, radius 0, no
 * background. The reference makes it a pill you can see and hit. Its current height is 15px -
 * below anyone's minimum target - so this also fixes a real hit-target problem rather than only
 * matching a picture.
 *
 * align-self keeps the pill hugging its text instead of stretching across the 960px column,
 * which is the failure a naive version of this rule produces. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.CENTER}"] [class*="_detailTop"] > [class*="_crumb"] {
  align-self: flex-start;
  min-height: 30px;
  padding: 0 14px 0 9px;
  border-radius: var(--dsh-bento-radius-pill);
  background: var(--dsh-bento-hover);
  transition: background-color var(--dsh-bento-motion) var(--dsh-bento-ease);
}

html[${ROOT_ATTR}] [${PART_ATTR}="${PART.CENTER}"] [class*="_detailTop"] > [class*="_crumb"]:hover {
  background: var(--dsh-bento-edge);
}

/* THE BOARD ITSELF: a two-column grid instead of one column of strips.
 *
 * Measured before: detailSections is flex/column/gap 32 holding the sections stacked at 960 wide
 * each. The reference puts the Components section wide and tiles beside each other.
 *
 * grid-template-columns, not a fixed 12-track template. The host's section count varies (this
 * build renders 1-3), and a 12-track grid would leave most tracks empty and shrink every cell.
 * Two equal tracks with minmax(0, 1fr) keeps children from overflowing their track (the 0
 * minimum) and degrades to one column when the page is narrow, which a 12-track template would
 * not do without a media query.
 *
 * The 32px gap drops to the bento gutter: the board is a set of cells, and 32px between cells
 * reads as separate pages rather than one board. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.CENTER}"] [class*="_detailSections"] {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--dsh-bento-gutter);
  align-items: start;
}

/* The section is a cell on that board: card tone, nested radius, its own padding. It keeps its
   internal flex column, so its heading and rows are untouched. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.CENTER}"] [class*="_detailSections"] > section {
  border-radius: var(--dsh-bento-radius-nested);
  background: var(--dsh-bento-card);
  border: 1px solid var(--dsh-bento-edge);
  padding: var(--dsh-bento-cell-inset);
}

/* THE WIDE SECTION SPANS BOTH TRACKS.
 *
 * The Components section is a list of plugins; at half width its rows wrap their descriptions to
 * three lines and the switch crowds the text. The build that has a _rows child is the list one,
 * so it is detected structurally rather than by position - a future build that reorders the
 * sections still gets the right one wide. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.CENTER}"] [class*="_detailSections"] > section:has([class*="_rows"]) {
  grid-column: 1 / -1;
}

/* THE HOST'S ROW LIST LOSES ITS CARD-IN-CARD LOOK.
 *
 * Inside a section, the host draws each plugin row as its own white card with its own radius and
 * a border. A bordered box inside a bordered cell inside a bordered page is three concentric
 * rectangles for one idea - the exact language this theme exists to remove.
 *
 * The rows keep their box (no display or width change) and lose only the paint, then gain the
 * pointer fill the rest of the theme uses. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.CENTER}"] [class*="_rows"] > * {
  border-radius: var(--dsh-bento-radius-inner);
  transition: background-color var(--dsh-bento-motion) var(--dsh-bento-ease);
}

html[${ROOT_ATTR}] [${PART_ATTR}="${PART.CENTER}"] [class*="_rows"] > *:hover {
  background: var(--dsh-bento-hover);
}

/* THE VERSION AND STATUS TAGS MATCH THE PILL TIER.
 *
 * Measured: both already compute to 999px from the host. They are re-declared through the token
 * so the pill tier has a single owner, and so a future change to the tier reaches them. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.CENTER}"] [class*="_versionTag"],
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.CENTER}"] [class*="_statusTag"] {
  border-radius: var(--dsh-bento-radius-pill);
}

/* The section count is a chip in the reference rather than loose text. Same tier. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.CENTER}"] [class*="_sectionCount"] {
  border-radius: var(--dsh-bento-radius-pill);
  padding: 2px 8px;
  background: var(--dsh-bento-hover);
}

/* OUR OWN SECTIONS FOLLOW THE SAME CELL RULE (D70).
 *
 * The plugins.detail.section entries draw their own chrome (the slot contract says so explicitly),
 * so the two sections mounted by 61-detail-sections.js arrive as bare elements on the board and
 * need the same treatment as the host's own cells. They carry the data-bento-detail attribute
 * rather than a hashed class, because that attribute is ours and cannot drift with an upgrade.
 *
 * They are addressed by that attribute - not by a hashed class - so a future harness build cannot
 * silently stop matching them. Both sections are short, so each takes a single track and they sit
 * side by side. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.CENTER}"] [data-bento-detail] {
  border-radius: var(--dsh-bento-radius-nested);
  background: var(--dsh-bento-card);
  border: 1px solid var(--dsh-bento-edge);
  padding: var(--dsh-bento-cell-inset);
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

/* The section heading matches the host's own section titles, which are 15px/500 in this build. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.CENTER}"] [data-bento-detail] > h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  line-height: 20px;
  color: var(--dsw-alias-label-primary);
}

/* The board section's rows draw a top rule each; the first one must not double up with the
   heading's own spacing. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.CENTER}"] [data-bento-detail="board"] > div > div:first-child {
  border-top: 0;
  padding-top: 0;
}

/* Reduced motion: the fills appear at once. */
@media (prefers-reduced-motion: reduce) {
  html[${ROOT_ATTR}] [${PART_ATTR}="${PART.CENTER}"] [class*="_detailTop"] > [class*="_crumb"],
  html[${ROOT_ATTR}] [${PART_ATTR}="${PART.CENTER}"] [class*="_rows"] > * {
    transition: none;
  }
}
`;

    FEATURES.push({
      id: 'detail-board',
      title: { en: 'Plugin detail board', zh: '插件详情版面' },
      about: {
        en: 'Lay the plugin detail page out as a bento board: a raised hero panel, a pill breadcrumb, and section cells instead of one column of strips.',
        zh: '把插件详情页排成便当式版面：抬起的标题面板、胶囊式面包屑，以及分区卡片而不是一列长条。',
      },
      order: 17,
      enabled: true,
      css: DETAIL_CSS,
    });
