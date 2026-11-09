/**
 * Feature: New Session as an accent pill (D84).
 *
 * The reference's sidebar draws its primary action as a tinted pill with an accent border,
 * not as a neutral bordered button:
 *
 *   min-height: 44px; border: 1px solid var(--accent-line); border-radius: 14px;
 *   background: var(--accent-soft); color: var(--accent-ink);
 *   font-size: 14px; font-weight: 600
 *
 * The host renders it as a white button with a neutral hairline, 38px tall, 12px radius,
 * 500 weight, 14px. So this file changes the SURFACE, the SIZE and the WEIGHT - all three
 * of which the reference states - and nothing else.
 *
 * THE THREE COLOURS ALREADY EXIST AND ARE DERIVED. D55 built the accent-soft tint and the
 * accent ink as mixes of the host accent (--dsh-bento-selected-fill,
 * --dsh-bento-selected-ink), and D69 built the accent hairline (--dsh-bento-accent-edge).
 * They are exactly the three values the reference names, resolved per theme and per accent,
 * so this file writes no colour of its own and gate 15 stays satisfied.
 *
 * Using the selection trio for the primary action is a deliberate overlap, not a collision:
 * the reference does the same thing with the same three values, and the two never appear in
 * the same state - a row is selected OR the New Session pill is idle. Measured contrast for
 * the ink on that tint is 6.40:1 light / 6.48:1 dark, AA for body text (D76).
 *
 * THE RADIUS STAYS 12px, DELIBERATELY. The reference says 14, and 14 is not a value this
 * theme uses: D45 established that the inner tier is the host's own 12px, and every row,
 * nav button and tile in the sidebar is on it. A 14px pill among 12px rows would be the
 * only 14 in the column - the exact inconsistency D45 was recorded to remove. The radius is
 * therefore the inner token, and the deviation from the reference is named here rather than
 * made silently.
 *
 * HEIGHT: 44px, from min-height, with the host's 8px block padding removed so the two do not
 * add up. Measured: 38px before, 44 after, width unchanged at 240, and the label box
 * unchanged (141x22) - so the button grew downward by 6px and nothing inside it moved. The
 * sidebar has room for that: the flexible list below it absorbs the 6px.
 */
    const NEWSESSION_CSS = `
/* The primary action reads as the accent's own control.
 *
 * Addressed by class substring ("newSession") because the host's names are hashed per build.
 * Counted before writing (the failure mode this census prevents): 1 button matches the full
 * selector; 5 elements match the bare substring, but only one of them is a BUTTON - the
 * others are the label span, the icon span and two wrappers inside it. Naming
 * button[class*="newSession"] is what makes the rule hit exactly the control.
 *
 * color on the button is not enough on its own: the host paints its label colour on the
 * label span too, so the span is named explicitly. The icon is a stroked SVG that follows
 * currentColor, so it takes the accent ink with no extra rule. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.SIDEBAR}"] button[class*="newSession"] {
  min-height: 44px;
  padding-block: 0;
  background: var(--dsh-bento-selected-fill);
  border-color: var(--dsh-bento-accent-edge);
  color: var(--dsh-bento-selected-ink);
  font-weight: 600;
  transition: background-color var(--dsh-bento-motion) var(--dsh-bento-ease);
}

html[${ROOT_ATTR}] [${PART_ATTR}="${PART.SIDEBAR}"] button[class*="newSession"] [class*="newSessionLabel"] {
  color: var(--dsh-bento-selected-ink);
  font-weight: 600;
}
`;

    FEATURES.push({
      id: 'new-session-pill',
      title: { en: 'New Session pill', zh: '新建会话胶囊' },
      about: {
        en: 'Draw the sidebar primary action as the reference does: an accent-tinted pill with an accent border, 44px tall, weight 600.',
        zh: '把侧栏的主操作按钮改成参考设计的样子：强调色淡填充、强调色描边、44px 高、字重 600。',
      },
      order: 12,
      enabled: true,
      css: NEWSESSION_CSS,
    });
