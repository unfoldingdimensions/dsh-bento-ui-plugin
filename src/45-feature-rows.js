/**
 * Feature: session rows as tiles.
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

/* Reduced motion: the border swap is instant rather than animated. */
@media (prefers-reduced-motion: reduce) {
  html[${ROOT_ATTR}] [${PART_ATTR}="${PART.SIDEBAR}"] [data-row-key^="session:"] {
    transition: none;
  }
}
`;

    FEATURES.push({
      id: 'row-tiles',
      title: { en: 'Session tiles', zh: '会话瓦片' },
      about: {
        en: 'Give each session row its own rounded edge and spacing instead of a flat list.',
        zh: '让每个会话行拥有独立的圆角与间距，而不是一张平铺的列表。',
      },
      order: 20,
      enabled: true,
      css: ROWS_CSS,
    });
