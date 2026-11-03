/**
 * Feature: the reference typefaces.
 *
 * The design this theme follows specifies Inter for UI text and JetBrains Mono for code.
 * Neither is installed on this machine and the host loads no webfont at all, so both are
 * carried inside the bundle as base64 (see tools/make-fontdata.mjs for why embedded rather
 * than served, and D59 for the size cost).
 *
 * ONE DECLARATION, NOT THIRTY-ONE.
 *
 * The obvious implementation is to override every --dsw-font-* token, because the measured
 * values look independent: --dsw-font-markdown-h1 reads back as a full shorthand with the
 * family spelled out, and so does --dsw-font-s-14 and thirty others. That reading is wrong.
 * A custom property is substituted when it is COMPUTED, so a token declared as
 * "14px/24px var(--dsw-font-family)" reads back with the stack already substituted. Measured
 * by redefining --dsw-font-family alone on body and re-reading all 183 font tokens: 62
 * followed, and exactly ONE stayed literal -- --dsw-font-family-brand, which is Montserrat
 * by design and belongs to the wordmark, not to body text.
 *
 * So the rule is two lines: point the root family tokens at the new faces, and let the 62
 * derived tokens resolve themselves. Overriding each of them by hand would be 62 chances to
 * drift out of step with the host, to fix a problem that does not exist.
 *
 * THE FALLBACKS ARE NOT DECORATION. Both subsets are latin-only, so every CJK codepoint,
 * every emoji and every glyph outside the subset falls through to the host's own stack,
 * which is reproduced here unchanged after the two new faces. Dropping "PingFang SC" and
 * "Microsoft YaHei" from this list would leave Chinese text in an arbitrary fallback.
 *
 * THE CODE STACK GETS THE SAME TREATMENT. D58 argued the pairing could not be delivered
 * because JetBrains Mono was absent; it is absent as an installed font and ships in the
 * bundle instead, so the pair is now real.
 */
    const FONT_FACE_CSS = `
/* Both faces are variable: one file covers the whole weight axis, so 400 for body copy and
   500 for a selected row come from the same 48 KB rather than from two more files. */
@font-face {
  font-family: 'Bento Inter';
  src: url(data:font/woff2;base64,${FONT_INTER_WOFF2}) format('woff2');
  font-weight: 100 900;
  font-style: normal;
  font-display: swap;
}

@font-face {
  font-family: 'Bento Mono';
  src: url(data:font/woff2;base64,${FONT_MONO_WOFF2}) format('woff2');
  font-weight: 100 800;
  font-style: normal;
  font-display: swap;
}

/* Declared on body, next to the host's own aliases, because the host declares its font
   tokens there too. A custom property substitutes on the element that declares it, so
   overriding these on html instead would leave the host's body values in place. */
html[${ROOT_ATTR}] body {
  --dsw-font-family: 'Bento Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  --ds-font-family-code: 'Bento Mono', 'SF Mono', 'JetBrains Mono', 'Fira Code', Consolas, 'Liberation Mono', Menlo, Courier, 'PingFang SC', 'Microsoft YaHei';

  /* The host sets font-family from the same token on this element, so redefining the token
     is normally enough. Stating it explicitly costs one line and covers the case where a
     host build stops reading its own token here. */
  font-family: var(--dsw-font-family);
}
`;

    FEATURES.push({
      id: 'ui-font',
      title: { en: 'Reference typeface', zh: '参考字体' },
      about: {
        en: 'Use Inter for interface text and JetBrains Mono for code, as the reference design does. Both ship with the theme.',
        zh: '界面文字使用 Inter，代码使用 JetBrains Mono，与参考设计一致。两者都随主题一同提供。',
      },
      order: 25,
      enabled: true,
      css: FONT_FACE_CSS,
    });
