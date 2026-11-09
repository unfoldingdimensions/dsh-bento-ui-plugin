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

/* THE DARK BAND ABOVE THE COMPOSER (D64).
 *
 * Reported as "the conversation pane is darker at the bottom in dark mode". It is the HOST's
 * own sticky scrim, not this theme's paint. Once a conversation is active the host applies:
 *
 *   .wSkVaW_root[data-phase=active] .wSkVaW_composerSeat {
 *     position: sticky; bottom: 0; z-index: 7;
 *     background: linear-gradient(180deg, transparent 0px, var(--dsw-alias-bg-base) 36px);
 *   }
 *
 * The gradient exists so content scrolling UNDER the composer fades out instead of being cut
 * off. It fades to --dsw-alias-bg-base, which the host assumes is the surface behind it.
 *
 * Measured, that assumption is what breaks in dark:
 *
 *   theme    bg-base           our canvas        our card
 *   light    rgb(255,255,255)  rgb(235,238,242)  rgb(255,255,255)
 *   dark     rgb(21,21,23)     rgb(27,27,28)     rgb(44,44,46)
 *
 * In LIGHT bg-base equals the card, so the gradient is invisible - nothing to fix. In DARK
 * bg-base is rgb(21,21,23) while the card is rgb(44,44,46): a 23-unit drop, measured down the
 * strip (44 -> 21 over 36px). The fade still does its job of hiding scrolling content, but it
 * fades to a tone 23 units darker than the surface it sits on, and reads as a smudge across
 * the bottom of the card.
 *
 * THE FIX KEEPS THE FADE AND CHANGES ITS DESTINATION. The transparent keyword is replaced with a
 * zero-alpha mix of the card tone rather than the keyword, because CSS interpolates toward
 * transparent as transparent BLACK - fading 'var(--dsh-bento-card)' to the 'transparent'
 * keyword would darken on the way, which is the same bug in miniature. Mixing the card tone
 * with itself at 0% gives a transparent CARD-COLOURED stop, so the ramp is purely in alpha and
 * the destination is now the surface actually behind it, in both themes.
 *
 * Scoped to the centre column and gated on the host's own phase rather than restyled globally:
 * with the theme off, or on any other surface, the host's gradient stays exactly as it was. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.CENTER}"] [data-phase="active"] [class*="composerSeat"] {
  background: linear-gradient(
    180deg,
    color-mix(in srgb, var(--dsh-bento-card) 0%, transparent) 0px,
    var(--dsh-bento-card) 36px
  );
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
  /* NO SHADOW (D79). This read 'var(--dsh-bento-shadow)', the token behind the opt-in
     card-shadow FEATURE, while the feature was off - so the dock was lifted by a feature the
     user had not enabled, and enabling it changed nothing here. D40's rule is that elevation
     stays at zero and separation is a hairline plus a fill step, so the dock gets the edge
     alone. It is a peer panel above the composer, not a surface the accent owns, which is why
     it does NOT take the accent halo the composer does. */
  box-shadow: inset 0 0 0 1px var(--dsh-bento-edge);
}

/* THE QUEUED-MESSAGE TAB BECOMES THE COMPOSER'S TOP SEGMENT (D67).
 *
 * Reported as "the queue message box has weird rectangle around it". Measured, three things make
 * it read as a separate box glued onto the composer rather than as part of it:
 *
 *   1. WIDTH.  The dock is 845px with 8px of padding each side, so the panel is 829px, while the
 *              composer below it is 861px. The tab is 16px narrower and inset 8px on both sides,
 *              so the card shows through around it - that exposed strip IS the rectangle.
 *   2. FILL.   It paints the host's frosted menu material: rgba(67,69,74,0.45) in dark over a
 *              44,44,46 card, resolving to 54,55,59 - a slab LIGHTER than the composer it sits on.
 *   3. OUTLINE. A 0.5px border on its ::after in --dsw-alias-border-l1, which is
 *              rgba(255,255,255,0.06) in dark and rgba(0,0,0,0.04) in light.
 *
 * None of those is wrong on the host's own flat white composer - a frosted tab with a hairline is
 * a normal floating-chip treatment. They are wrong once the composer became a white raised card
 * with a 28px radius (D61): a narrower, lighter, outlined box sitting on top of it reads as a
 * mistake, not as a stack.
 *
 * SO THE TAB JOINS THE CARD. Full width, the card tone, the composer's own top radius, no
 * backdrop, no outline. The host already places it flush - its own margin-bottom is
 * calc(0 - gap - 3px), measured at -9px, which puts the panel 1px INTO the composer's top edge -
 * so removing the outline and matching the tone and width makes the two read as one surface
 * without moving either.
 *
 * THE RADIUS IS THE COMPOSER'S OWN, READ FROM ITS TOKEN. The composer card takes
 * var(--dsw-radius-panel) (measured 28px); the theme's card tier is a different curve (24px
 * since D69) and a 24px top corner under a 28px composer would be visibly tighter on the same
 * silhouette. So the
 * tab reads the same host token rather than a literal, and follows the composer if the host
 * retunes it.
 *
 * THE WIDTH IS THREE VALUES, NOT ONE. The dock's own rule is
 *
 *   width: calc(100% - side-clearance*2 - dock-inset*2)
 *   padding: 0 dock-inset
 *
 * so removing the padding alone leaves the box 845px against the composer's 861px: 8px of
 * side-clearance each side is still being subtracted from the width itself. Both have to go.
 * The two custom properties are zeroed on the dock rather than the width being overridden with a
 * literal, so the host's own calc still runs and still tracks whatever the composer's max-width
 * turns out to be.
 *
 * Both border-radius values carry four components, and only the TOP two are the card's curve -
 * the bottom two are 0 so the tab's bottom edge stays square where it meets the composer. */
html[${ROOT_ATTR}] [data-slot="conversation.composer"] [data-queue-dock] {
  --dsh-composer-side-clearance: 0px;
  --dsh-composer-dock-inset: 0px;
  padding-inline: 0;
}

html[${ROOT_ATTR}] [data-slot="conversation.composer"] [data-queue-dock] > * {
  border-radius: var(--dsw-radius-panel) var(--dsw-radius-panel) 0 0;
  background: var(--dsh-bento-card);
}

html[${ROOT_ATTR}] [data-slot="conversation.composer"] [data-queue-dock] > *::before {
  background: var(--dsh-bento-card);
  backdrop-filter: none;
}

html[${ROOT_ATTR}] [data-slot="conversation.composer"] [data-queue-dock] > *::after {
  border: 0;
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
