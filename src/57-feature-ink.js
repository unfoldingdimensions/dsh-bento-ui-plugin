/**
 * Feature: the selection label colour.
 *
 * The accent's paired label colour. Default is "automatic": the theme's own derivation - the
 * accent mixed 65% toward the label colour (D55) - which was measured against all eight
 * accents in both themes and clears AA everywhere (worst 5.90:1).
 *
 * "AUTOMATIC" IS A REAL OPTION, NOT A PLACEHOLDER. The requirement was "each accent comes with
 * its own text colour, but we need the ability to change it as well". Those are two states:
 * follow the accent (the pair, correct by construction), or depart from it. Modelling the
 * default as a stored value that happens to equal the derivation would mean a later palette
 * change silently kept the old literal; modelling it as `auto` means the pair stays correct
 * when the accent changes, and only an explicit override pins a colour.
 *
 * A CUSTOM COLOUR IS STORED PER THEME. A colour that reads on a light tint frequently does not
 * read on a dark one - that is exactly the failure mode that made an invented ink table fail
 * at 1.20:1 (D63). So the light and dark overrides are separate values, and each is applied
 * with the same `body[data-ds-dark-theme]` split the accent uses.
 *
 * WHERE IT APPLIES. Only the selected-row label - the one place the theme paints text in the
 * accent ink. The accent token itself is not touched: this overrides the ink, not the accent,
 * so the Send button and the tint keep following the accent the user picked.
 */
    const INK_CSS = (value) => {
      // `auto` means "let the theme derive it". Emitting an empty block keeps the contract
      // identical for both states, so paint() never has to special-case a falsy result.
      if (!value || value.id === 'auto') return '';
      const { light, dark } = value;
      const lightDecl = light ? `--dsh-bento-selected-ink: ${light};` : '';
      const darkDecl = dark ? `--dsh-bento-selected-ink: ${dark};` : '';
      if (!lightDecl && !darkDecl) return '';
      return `
/* The selected label's ink, overridden. Unset themes keep the theme's own derivation, so an
   override of one theme alone does not disable the other. */
html[${ROOT_ATTR}] body { ${lightDecl} }
html[${ROOT_ATTR}] body[data-ds-dark-theme] { ${darkDecl} }
`;
    };

    /**
     * The label-colour options are not a fixed palette: the requirement is a free colour
     * choice. The selector renders a colour input, and these two stored values are what it
     * writes. `auto` is offered as the reset.
     */
    FEATURES.push({
      id: 'ink',
      title: { en: 'Label colour', zh: '文字颜色' },
      about: {
        en: 'The colour of a selected label. Automatic follows the accent; pick a colour to override it.',
        zh: '选中项文字的颜色。自动表示跟随强调色，也可以自行指定。',
      },
      order: 41,
      choice: true,
      options: [], // free colour, not a fixed list
      store: 'json',
      defaultChoice: 'auto',
      css: INK_CSS,
    });
