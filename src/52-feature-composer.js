/**
 * Feature: composer spacing.
 *
 * The composer's own chrome and the statistics strip beneath it are laid out by the host
 * at values that read as cramped once the shell around them has room to breathe:
 *
 *   stats bar  row gap 12px, but each pill has padding 1px 8px and each middot separator
 *              has margin 0 6px - so three values compete inside 22px of height
 *   composer   the control row sits with no gap scale of its own
 *
 * This feature does not redesign either of them. It gives the strip a single spacing
 * scale, which is the fix for "everything is crowded here": the problem was never one
 * number, it was three unrelated ones.
 *
 * STABLE HOOKS ONLY. The bar carries `data-composer-stats`, a data attribute the host
 * writes itself, so nothing here depends on a CSS-module hash. Its inner parts are
 * addressed through their role fragment (anchor / pill / sep), which is the same
 * structural approach used for the Settings tile renderers.
 *
 * WHY A SETTING. Density is a preference: someone with a short window wants the compact
 * strip, someone on a large display wants air. Shipping one value would be a taste
 * decision imposed on both.
 */
    const COMPOSER_CSS = `
/* ONE SPACING SCALE FOR THE STATS STRIP.
 *
 * Measured before: row gap 12, pill padding 1px 8px, separator margin 0 6px. Those three
 * numbers were unrelated, which is what made the strip read as crowded rather than
 * compact - the gaps between groups and the gaps inside a group were nearly the same,
 * so nothing grouped.
 *
 * The scale below makes the relationship explicit: a group's internal gap is smaller
 * than the gap between groups. That is what makes two statistics read as two, instead of
 * as five fragments in a row.
 *
 * SPECIFICITY, learned the hard way: the host sets gap: 12px on this element with a class
 * selector, and a single attribute selector of ours loses to it regardless of source
 * order. Measured with the first version: the computed gap stayed 8px - our own token
 * fallback - so the rule appeared to be working while actually doing nothing. Repeating
 * the attribute raises it above the host's without !important. */
html[${ROOT_ATTR}] [data-composer-stats][data-composer-stats] {
  gap: calc(var(--dsh-bento-gap) + 4px);
  padding-block: 2px;
}

html[${ROOT_ATTR}] [data-composer-stats] [class*="pill"] {
  gap: 7px;
  padding: 3px 8px;
}

html[${ROOT_ATTR}] [data-composer-stats] [class*="sep"] {
  margin-inline: 2px;
}

/* The composer seat's own bottom inset. Measured: the strip sat flush against the card's
   lower edge, so the last row of text had no breathing room below it. */
html[${ROOT_ATTR}] [data-slot="conversation.composer"] {
  padding-block-end: 2px;
}
`;

    FEATURES.push({
      id: 'composer-spacing',
      title: { en: 'Composer spacing', zh: '输入栏间距' },
      about: {
        en: 'Give the composer and its statistics strip a real spacing scale, so the numbers group instead of crowding.',
        zh: '给输入栏和下方统计条一套统一的间距规则，让各项数据成组而不是挤在一起。',
      },
      order: 24,
      enabled: true,
      css: COMPOSER_CSS,
    });
