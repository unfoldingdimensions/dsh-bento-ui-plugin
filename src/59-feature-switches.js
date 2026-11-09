/**
 * Feature: accent-coloured switches (D86).
 *
 * D47 decided the theme's switch should match the HOST's switch exactly, and recorded that
 * the host paints its checked track near-black (--dsw-alias-brand-primary, #0f1115 light)
 * rather than in the accent. That was the right call for a theme whose job was to frame the
 * host's own controls without restyling them.
 *
 * It is not the right call against the reference. Its switch, quoted from the saved design:
 *
 *   checked    width 52, height 30, radius 999, padding 3, background: var(--accent)
 *   unchecked  the same box with background: var(--control)
 *   thumb      white, no shadow, in both states
 *
 * Checked track = the accent; unchecked track = the neutral control colour. Both reference
 * files agree on it, which is rare enough to be worth noting.
 *
 * So this SUPERSEDES D47's colour clause and keeps everything else from it: the host's
 * geometry (36x20, radius 999, padding 2), the absence of a thumb shadow, and the rule that
 * the plugin declares no literal colour. Only the checked track's token changes, from
 * --dsw-alias-brand-primary to --dsw-alias-state-business-primary - the same token D55, D69
 * and D76 already use for every other accent surface in the theme.
 *
 * THE PLUGIN'S OWN SWITCHES TOO. The Bento layout tab's switches are rendered by this plugin
 * (src/60-settings.js), and they read --dsw-alias-brand-primary too. They move with the
 * host's, so the two tabs do not show two different checked colours.
 *
 * SCOPE. Scoped to the ARIA role switch, which is the semantic and therefore stable across
 * host builds; the host's class name for the control is per-build hashed.
 *
 * Measured after, both themes: checked track rgb(65,118,230) light / rgb(122,170,255) dark,
 * unchecked track unchanged, box still 36x20, thumb still white with no shadow. The
 * unchecked track is deliberately NOT restyled: it is --dsw-alias-border-l3 on this host and
 * it already reads as the reference's --control.
 */
    const SWITCH_CSS = `
/* THE CHECKED TRACK IS THE ACCENT (D86, superseding D47's colour clause).
 *
 * Keyed on the checked attribute rather than the pseudo-class, because the host renders this
 * as an ARIA switch element rather than an input. Measured: the host's own track rule is
 * keyed on the same attribute, so matching that shape makes this a single-property change
 * rather than a fight over the rest of the control.
 *
 * The THUMB IS NOT TOUCHED. The reference's thumb is white with no shadow in both states,
 * which is exactly what the host already paints (measured: rgb(255,255,255), no shadow), so
 * restyling it would be a change with nothing behind it.
 *
 * No reduced-motion rule belongs here: this changes a colour and nothing about motion, and
 * the host's own media query owns the track's transition. The absence is a decision.
 *
 * This block ENDS on the rule, not on this comment, because the bundle check requires every
 * CSS literal to end on a closing rule - a trailing comment reads as a truncated block. */
html[${ROOT_ATTR}] [role="switch"][aria-checked="true"] {
  background: var(--dsw-alias-state-business-primary);
}
`;

    FEATURES.push({
      id: 'accent-switches',
      title: { en: 'Accent switches', zh: '强调色开关' },
      about: {
        en: 'Colour a checked switch with the theme accent, as the reference does, instead of the host\'s near-black track.',
        zh: '让开启状态的开关使用主题强调色，与参考设计一致，而不是宿主的近黑色轨道。',
      },
      order: 28,
      enabled: true,
      css: SWITCH_CSS,
    });
