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

/* A Workspace heading separates groups rather than being one, so it has no
   border; the extra top margin is what makes the group break readable. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.SIDEBAR}"] [data-row-key^="workspace:"] {
  margin-block-start: var(--dsh-bento-gutter);
}

/* The two top-level destinations match the session tiles instead of sitting at
   the host's 12px with no edge. The border is declared transparent so the row's
   box does not change when the edge appears on hover — a 1px addition here would
   shift the 36px button and every row below it. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.SIDEBAR}"] [class*="panelList"] > button {
  border-radius: var(--dsh-bento-radius-inner);
  border: 1px solid transparent;
  margin-block: 1px;
  transition:
    border-color var(--dsh-bento-motion) var(--dsh-bento-ease),
    background-color var(--dsh-bento-motion) var(--dsh-bento-ease);
}

html[${ROOT_ATTR}] [${PART_ATTR}="${PART.SIDEBAR}"] [class*="panelList"] > button:hover,
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.SIDEBAR}"] [class*="panelList"] > button:focus-visible {
  border-color: var(--dsh-bento-edge);
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
