/**
 * Feature: the accent.
 *
 * Picks which accent the theme uses. It is a `choice` feature, not a switch: the selector in
 * Settings lists the palette, and the chosen value is stored and painted.
 *
 * TWO TOKENS, MEASURED. Overriding --dsw-alias-state-business-primary alone moves the
 * theme's own selection tint and ink but NOT the Send button, because the host paints that
 * from --dsw-alias-button-info-fill - a separate token that happens to hold the same literal.
 * Probed one token at a time to find out:
 *
 *   --dsw-alias-state-business-primary   moves nav selected fill, nav selected ink,
 *                                        session row fill, session row ink
 *   --dsw-alias-button-info-fill         moves the Send button
 *   --dsw-alias-link                     moves nothing on the surfaces measured
 *   --dsw-alias-state-business-tertiary  moves nothing
 *
 * So the accent is exactly two tokens, and both are set here. An accent that moved only the
 * selection would be visibly half-applied - a teal app with a blue Send button.
 *
 * EVERYTHING ELSE DERIVES. The theme's selection fill and ink are color-mix() expressions
 * over the accent token, so they follow automatically. The derived ink was measured against
 * all eight accents in both themes: worst 5.90:1 (teal, light), where AA asks 4.5:1. That is
 * why there is no per-accent ink table - see 16-palette.js.
 *
 * SPECIFICITY. A bare `body { --token: … }` LOSES to the host's own body rule: probed, it
 * read back the host value. `html[data-dsh-bento] body` wins in both themes, which is the same
 * level the token layer already declares at.
 *
 * DARK MODE. The host marks dark with `data-ds-dark-theme` on body, so the dark swatch is
 * selected with `body[data-ds-dark-theme]`. `prefers-color-scheme` is deliberately not used:
 * the user can force either theme regardless of the OS, and following the OS would then paint
 * the wrong swatch.
 */
    const ACCENT_CSS = (accentId) => {
      const accent = ACCENTS.find((entry) => entry.id === accentId) || ACCENTS[0];
      return `
/* The accent, chosen. Light swatch on the body rule, dark swatch when the host marks dark. */
html[${ROOT_ATTR}] body {
  --dsw-alias-state-business-primary: ${accent.light};
  --dsw-alias-button-info-fill: ${accent.light};
}

html[${ROOT_ATTR}] body[data-ds-dark-theme] {
  --dsw-alias-state-business-primary: ${accent.dark};
  --dsw-alias-button-info-fill: ${accent.dark};
}
`;
    };

    FEATURES.push({
      id: 'accent',
      title: { en: 'Accent', zh: '强调色' },
      about: {
        en: 'The colour used for selection, the Send button and links. Blue is the host default.',
        zh: '用于选中状态、发送按钮和链接的颜色。默认是蓝色。',
      },
      order: 40,
      choice: true,
      options: ACCENTS,
      defaultChoice: DEFAULT_ACCENT,
      css: ACCENT_CSS,
    });
