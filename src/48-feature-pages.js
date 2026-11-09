/**
 * Feature: full pages that mount in the centre column.
 *
 * The centre column is not only the conversation. The Plugins page and the
 * MCP-connector page render there as complete applications of their own, with their
 * own header, sections, rows and switches. They previously inherited the card (they
 * sit inside it) but none of its language: every row was a flat transparent strip on
 * the card, so the page read as host UI dropped into a bento frame.
 *
 * WHAT IS SAFE TO TOUCH, measured rather than assumed. The page's class names are
 * hashed per build ('X_2TxG_card'), so this file does not name them. What it does
 * rely on is stable:
 *
 *   - the page root is 'section' inside the centre column, reached structurally
 *   - the row cards are 'li' elements, and their wrapper is a 'ul'
 *   - the group headings are 'h3'
 *   - switches are '[role="switch"]'
 *
 * Those are element and ARIA semantics, not build artefacts.
 *
 * WHAT THIS DOES NOT DO: it does not restyle the page's typography, its toolbar, its
 * badges, or its switches. The host tuned those, and the page is dense enough that
 * re-tinting its text would be guesswork. This pass gives the page the same surface
 * language as the rest of the theme — rows on the card, spacing instead of edges —
 * and stops there.
 */
    const PAGE_CSS = `
/* Rows on a page render as tiles on the card. The host already rounds them (20px)
   and gives them a 2px gap; what is missing is a surface, so they read as one flat
   list. A pointer fill and the theme's own inner radius make them tiles.
   Scoped to the centre column so a page mounted anywhere else is untouched. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.CENTER}"] section ul > li {
  border-radius: var(--dsh-bento-radius-inner);
  transition: background-color var(--dsh-bento-motion) var(--dsh-bento-ease);
}

/* The pointer fill, and the keyboard fill that has to match it.
 *
 * :has(:focus-visible) rather than :focus-within, for the same reason as the Settings
 * board (50-feature-settings.js): :focus-within also matches after a mouse click on a
 * switch, which would leave a row filled with the hover tone long after the pointer
 * had left — a fill that no longer means "focus". Requiring a focus-visible
 * descendant keeps this tied to keyboard navigation, which is what hover is for the
 * pointer. Measured: the two now compute the same tone. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.CENTER}"] section ul > li:hover,
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.CENTER}"] section ul > li:has(:focus-visible) {
  background: var(--dsh-bento-hover);
}

/* THE FOCUS RING MUST FOLLOW THE TILE'S RADIUS.
 *
 * The host already draws the keyboard focus indicator, and it is a good one: a 2px
 * brand-coloured ring on the focused control's ::after, positioned absolutely with
 * inset 0 in a containing block that resolves to the ROW. The ring therefore outlines
 * the whole card rather than the control, and no indicator needed to be added here.
 * (An earlier survey missed this: it read the control's own outline, found none, and
 * concluded keyboard users saw nothing. The ring lives on the pseudo-element.)
 *
 * What the host cannot know is that this feature changed the row's radius. It draws
 * the ring at its own card radius, 20px; the row above it is now 14px. Left alone the
 * two disagree at every corner: the ring arcs wider than the surface it outlines, so
 * the curves separate and a focused row reads as double-rounded.
 *
 * Inheritance is not the fix: the pseudo inherits from the BUTTON, a zero-radius
 * content-sized box inside the row, not from the row. The radius is set explicitly,
 * and only while the control is focus-visible.
 *
 * This is a RENDER fix, not a layout one. Border-radius paints inside the box and
 * changes no dimension, which is what makes touching a host-owned pseudo safe.
 *
 * The selector is structural because the control is not a direct child of the row:
 * li > div > div > div > button, and the page's class names are hashed per build.
 *
 * Scope verified rather than assumed: of every pseudo-element inside a row, exactly
 * one paints a box — the focus ring. Every other ::after in the row computes
 * content: none, so this rule is inert on them. That was measured on the shipped
 * build (13 rows, 22 controls), not reasoned about. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.CENTER}"] section ul > li *:focus-visible::after {
  border-radius: var(--dsh-bento-radius-inner);
}

/* The group heading is NOT restyled here any more. This block used to carry
   'letter-spacing: 0', which measured as writing nothing: letter-spacing 0px COMPUTES to
   "normal" in this Chrome, so the declaration was indistinguishable from the host's own
   value. Verified by setting it on a synthetic element: '0', '0px', '0em' and 'normal' all
   read back "normal", while '0.001px' reads back "0.001px" - so the property IS settable
   and only the zero is a no-op. The section heading's weight and size are now owned by the
   type-scale feature (58-feature-typescale.js), which is where a scale belongs. */

/* THE PAGE HEADER BAR IS PART OF THE CARD, NOT A DARK BAND (D85).
 *
 * Reported as the Plugins page having a darker strip across its top in dark mode, and the
 * pixels are unambiguous: sampling a vertical line down the centre column in dark gave
 * rgb(21,21,23) from y=20 to y=95, then rgb(44,44,46) from y=100 down. Two different
 * surfaces, one card.
 *
 * The cause is the host's sticky page bar. Measured: _pageBar is position: sticky, z-index 2,
 * and paints its background on its own ::before, which resolves to rgb(21,21,23) in dark -
 * that is --dsw-alias-bg-base, the same token D64 had to replace in the composer's scrim. In
 * light the same declaration is rgb(255,255,255), which is why nothing looked wrong there.
 *
 * The theme's card is rgb(44,44,46), so the bar reads as a 23-unit band laid across the top of
 * the card. The bar's own background is EMPTY (rgba(0,0,0,0)) - all of the paint is on the
 * pseudo - so clearing the pseudo's background is the whole fix.
 *
 * NOT TRANSPARENT, CARD-COLOURED. 'background: transparent' would leave the bar's sticky
 * pseudo compositing against whatever scrolls under it, and content sliding beneath a sticky
 * header is exactly what the host paints this pseudo FOR. Giving it the card tone keeps the
 * occlusion behaviour and removes only the tone mismatch.
 *
 * SCOPED TO THE CENTRE COLUMN, which is where the theme painted the card. The same page bar
 * appears on pages that are not on this card (the plugin detail view uses its own chrome), and
 * a global override would repaint chrome the theme did not card. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.CENTER}"] [class*="pageBar"]::before {
  background: var(--dsh-bento-card);
}

/* The header itself carries no fill of its own (measured: rgba(0,0,0,0)), so it needs no rule.
   Recorded because "clear the header too" looks like the obvious next line and would be a
   declaration on a host element that paints nothing. */

/* Reduced motion: the fill appears at once rather than fading in. */
@media (prefers-reduced-motion: reduce) {
  html[${ROOT_ATTR}] [${PART_ATTR}="${PART.CENTER}"] section ul > li {
    transition: none;
  }
}
`;

    FEATURES.push({
      id: 'page-rows',
      title: { en: 'Page rows', zh: '页面行' },
      about: {
        en: 'Give the rows of full pages in the conversation column (Plugins, MCP) the same tile treatment.',
        zh: '让对话栏里的整页（插件、MCP）中的行采用同样的瓦片样式。',
      },
      order: 16,
      enabled: true,
      css: PAGE_CSS,
    });
