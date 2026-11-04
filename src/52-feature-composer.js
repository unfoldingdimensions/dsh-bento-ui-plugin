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

/* THE TO-DOS DOCK GETS A SURFACE OF ITS OWN (D62).
 *
 * The host renders it into the slot "conversation.input.dock" (slot id "todo", order 0),
 * so that anchor identifies it without a CSS-module hash. Its own stylesheet
 * (TodoPanel.module.css) gives it:
 *
 *   background:      var(--dsw-specific-menu)         -> rgba(248,249,250,0.58), 58% alpha
 *   backdrop-filter: var(--dsw-menu-backdrop-filter)  -> measured none on this host
 *   box-shadow:      var(--dsw-elevation-panel)       -> measured none on this host
 *   border:          0
 *
 * That is a frosted material meant to float over CONTENT it can blur and be separated from
 * by the shadows behind it. Here it sits on the conversation CARD - a white surface - so 58%
 * near-white over white composites to white, the blur has nothing to blur, and the elevation
 * shadow is none. The bar had no edge at all: the report was "just getting merged in the
 * white background", which is literally what the compositing does.
 *
 * THE FIX IS A DISTINCT TONE, NOT A DARKER WASH. The panel takes --dsh-bento-card, so it is
 * separated from the card it sits on by tone, the same way every raised surface in this
 * theme is. The host's hairline and elevation are replaced by ours (inset hairline + the
 * theme's soft shadow) so one declaration holds in both themes: --dsw-alias-border-l1
 * measures rgba(0,0,0,0.04) and --dsw-specific-menu is 58% alpha, and neither survives a
 * dark card.
 *
 * BOTH STATES, ONE RULE. Collapsed and expanded render the same root element and differ only
 * by whether the <ul> exists (measured 829x36 vs 829x204, same radius, same fill), so
 * styling the container's surface covers both. No state selector is needed and none is
 * written - the element carries no collapsed/expanded attribute to select on.
 *
 * NOT ADDED: a gap or margin. The bar is already separated from the composer by the host's
 * own dock inset; this request was the surface, and widening that spacing would be a layout
 * change nobody asked for. */
html[${ROOT_ATTR}] [data-slot="conversation.input.dock"] > * {
  background: var(--dsh-bento-card);
  /* The host's frosted material retires with its fill: over an opaque tone the blur can only
     cost compositing, and it measured none here anyway. */
  backdrop-filter: none;
  box-shadow: inset 0 0 0 1px var(--dsh-bento-edge), var(--dsh-bento-shadow);
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
