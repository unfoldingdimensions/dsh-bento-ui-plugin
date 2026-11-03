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
 * hashed per build (`X_2TxG_card`), so this file does not name them. What it does
 * rely on is stable:
 *
 *   - the page root is `section` inside the centre column, reached structurally
 *   - the row cards are `li` elements, and their wrapper is a `ul`
 *   - the group headings are `h3`
 *   - switches are `[role="switch"]`
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

html[${ROOT_ATTR}] [${PART_ATTR}="${PART.CENTER}"] section ul > li:hover {
  background: var(--dsh-bento-hover);
}

/* The group heading separates sections rather than being one, so it gets breathing
   room above and none of the row treatment. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.CENTER}"] section h3 {
  letter-spacing: 0;
}

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
