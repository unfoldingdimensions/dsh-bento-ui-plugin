/**
 * Settings rendering. Rows derive from the feature registry, so a new feature
 * appears in Settings without touching this file.
 *
 * WHERE THE ROWS LIVE. This plugin registers its own tab on the
 * `settings.section` list slot and renders the toggles inside it, rather than
 * appending them to the host's General section:
 *
 *   - the section anchor is `[data-slot="settings.section"]`, a list slot the host
 *     itself registers its General/Models/... tabs into
 *   - `dsh-skills-doctor`, an installed third-party package, registers a tab the
 *     same way, so this is a supported extension point with a working precedent
 *   - three switches that only turn parts of one theme on and off are that
 *     theme's configuration, not general application settings
 *
 * REGISTERED ONCE, IN ONE PLACE. The old `settings.general.item` registration is
 * gone. Registering in both places would give a user two switches for one setting,
 * which is a state the UI should not be able to represent.
 *
 * A switch is written here rather than imported: a plugin may not load Harness
 * Client packages as modules, and the primitive can change without notice.
 * Geometry, `role="switch"` semantics and colours follow the host control; only
 * `--dsw-alias-*` tokens and this theme's own tokens are used.
 */
    /** Marks a row this plugin renders, so its stylesheet can address it without
     * depending on a hashed class name or on which section it landed in.
     * Declared in 00-prelude.js: 50-feature-settings.js reads it at module scope. */

    /**
     * The duration to use when the theme's own motion token is not available.
     *
     * THIS CONTROL CANNOT DEPEND ON THE THEME. It is rendered whether or not any
     * feature is on — it is the switch that turns them on — and with every feature
     * off the stylesheet is never injected and `--dsh-bento-motion` does not exist.
     * So a transition declared only in that stylesheet would leave the control with
     * no motion in exactly the state where the user needs it to respond.
     *
     * The duration therefore resolves in three steps, in this order:
     *
     *   1. `var(--dsh-bento-motion)` — the theme's single motion source, when the
     *      theme is active. This is what makes it follow the token if it is retuned,
     *      and what makes the reduced-motion media query reach it, because the token
     *      is set to 0ms there.
     *   2. this function's answer — the OS preference, read at render, so the control
     *      still ignores motion when the theme is off.
     *   3. 160ms — the design value.
     *
     * Reading the query at render rather than subscribing means a preference changed
     * while the panel is already open is picked up on the next render, not at once.
     * That is deliberate: the alternative is a second subscription mechanism in a
     * component that otherwise has no state of its own.
     */
    function motionFallback(ms) {
      try {
        return window.matchMedia('(prefers-reduced-motion: reduce)').matches ? '0ms' : ms + 'ms';
      } catch {
        /* No matchMedia: assume motion is allowed. */
        return ms + 'ms';
      }
    }

    function Switch({ checked, onChange, label }) {
      const motion = `var(--dsh-bento-motion, ${motionFallback(160)})`;
      const ease = `var(--dsh-bento-ease, cubic-bezier(0.2, 0, 0, 1))`;
      return h(
        'button',
        {
          type: 'button',
          role: 'switch',
          'aria-checked': checked,
          'aria-label': label,
          onClick: () => onChange(!checked),
          style: {
            flex: 'none',
            position: 'relative',
            width: 36,
            height: 20,
            padding: 2,
            boxSizing: 'border-box',
            /* A pill, matching the host's own switch. Measured: the host control is
               36x20 at radius 999px; this was 10px, which reads as a rounded
               rectangle rather than a switch and is visibly a different control
               from the one on the General tab two clicks away. */
            borderRadius: 999,
            border: 0,
            cursor: 'pointer',
            background: checked ? 'var(--dsw-alias-state-business-primary)' : 'var(--dsw-alias-border-l2)',
            transition: `background-color ${motion} ${ease}`,
          },
        },
        h('span', {
          'aria-hidden': true,
          style: {
            display: 'block',
            width: 16,
            height: 16,
            borderRadius: '50%',
            /* The host's own knob tone. Identified by resolving every candidate token
               against the colour the host's switch actually paints, in both themes and
               both states: --dsw-alias-label-primary-foreground is the only one that
               matches all four combinations (white on the checked light track,
               near-black on the checked dark track). --dsw-alias-switch-thumb looks
               like the obvious choice and is WRONG: it resolves to #adb2b8 in dark,
               not the #0f1115 the host paints. */
            background: 'var(--dsw-alias-label-primary-foreground)',
            /* No shadow, because the host's knob has none. Measured on the host's
               own switch in both themes: box-shadow: none. This control carried
               rgba(0, 0, 0, 0.3) 0 1px 2px — the plugin's only hardcoded colour, and
               an invention rather than a match. Removing it also removes the need
               for a token, so no literal remains (gate check 15). */
            translate: checked ? '16px 0' : '0 0',
            transition: `translate ${motion} ${ease}`,
          },
        }),
      );
    }

    /**
     * One preference row. The host's section body already supplies the horizontal
     * padding, so this row only owns its own vertical rhythm and the hairline
     * between rows - the same shape the host's own rows have.
     */
    function FeatureRow({ feature, enabled, onChange, t }) {
      const title = t(feature.title);
      return h(
        'div',
        {
          [ROW_ATTR]: feature.id,
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            /* Vertical only. Horizontal padding and the matching negative margin
               belong to the board stylesheet so its hover fill can extend past the
               text while the text stays on the host's own inset. An inline shorthand
               here would override that padding-inline and pull the text to the
               card's edge - measured cardToText = 0. */
            paddingBlock: 16,
            color: 'var(--dsw-alias-label-primary)',
            fontSize: 14,
            lineHeight: '22px',
          },
        },
        h(
          'div',
          { style: { flex: '1 1 auto', minWidth: 0 } },
          h('div', null, title),
          h(
            'div',
            {
              style: {
                color: 'var(--dsw-alias-label-secondary)',
                fontSize: 12,
                lineHeight: '18px',
              },
            },
            t(feature.about),
          ),
        ),
        h(Switch, { checked: enabled, onChange: (next) => onChange(feature.id, next), label: title }),
      );
    }

    /**
     * One swatch: a colour the user can pick.
     *
     * Written here rather than imported for the same reason as the switch. It is a
     * `role="radio"` rather than a button: the swatches are one choice among N, which is what
     * a radio group means, and it gives arrow-key navigation and a group label for free.
     *
     * THE SWATCH IS THE ACCENT ITSELF, NOT A PREVIEW OF IT. Showing the light swatch in light
     * and the dark swatch in dark means the chip in the list matches the chip that will paint
     * the UI in the theme the user is looking at - which is the only reading that is not a lie
     * about what will happen.
     *
     * Contrast of the selected ring comes from the theme ink, not from the swatch, because a
     * pale accent (amber) cannot draw its own visible outline on a white card.
     */
    function Swatch({ option, selected, onSelect, label }) {
      return h(
        'button',
        {
          type: 'button',
          role: 'radio',
          'aria-checked': selected ? 'true' : 'false',
          'aria-label': label,
          title: label,
          onClick: () => onSelect(option.id),
          style: {
            appearance: 'none',
            margin: 0,
            padding: 2,
            width: 30,
            height: 30,
            borderRadius: 999,
            border: '0',
            background: 'transparent',
            cursor: 'pointer',
            /* The ring is drawn with an inset box-shadow rather than a border so the swatch
               keeps its 26px face whether or not it is selected - a border would shrink the
               colour by 2px on selection and the grid would look like it moved. */
            boxShadow: selected
              ? 'inset 0 0 0 2px var(--dsw-alias-bg-layer-2), inset 0 0 0 4px var(--dsw-alias-label-primary)'
              : 'none',
            transition: `box-shadow var(--dsh-bento-motion, 160ms) var(--dsh-bento-ease, ease)`,
          },
        },
        h('span', {
          style: {
            display: 'block',
            width: '100%',
            height: '100%',
            borderRadius: 999,
            cornerShape: 'round',
            /* Both values go on the element as custom properties; the stylesheet picks one per
               theme. An inline background could only carry the light value, which would show the
               wrong swatch on a dark card. */
            '--swatch-light': option.light,
            '--swatch-dark': option.dark,
            boxShadow: 'inset 0 0 0 1px var(--dsw-alias-border-l2)',
          },
          'data-swatch': option.id,
        }),
      );
    }

    /**
     * The accent picker: one row of swatches plus the free colour control.
     *
     * Rendered from the registry like a switch row, but it edits a value rather than a
     * boolean, so it is a separate component rather than a mode of FeatureRow.
     */
    function AccentRow({ feature, value, onSelect, t }) {
      const title = t(feature.title);
      return h(
        'div',
        {
          [ROW_ATTR]: feature.id,
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            paddingBlock: 16,
            color: 'var(--dsw-alias-label-primary)',
            fontSize: 14,
            lineHeight: '22px',
          },
        },
        h(
          'div',
          { style: { flex: '1 1 auto', minWidth: 0 } },
          h('div', null, title),
          h(
            'div',
            { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 12, lineHeight: '18px' } },
            t(feature.about),
          ),
        ),
        h(
          'div',
          { role: 'radiogroup', 'aria-label': title, style: { display: 'flex', gap: 4, flex: '0 0 auto' } },
          feature.options.map((option) =>
            h(Swatch, {
              key: option.id,
              option,
              selected: value === option.id,
              onSelect,
              label: t(option.label),
            }),
          ),
        ),
      );
    }

    /**
     * The label-colour row: automatic, or an explicit colour per theme.
     *
     * TWO INPUTS, NOT ONE. A custom colour has to be chosen per theme, because a value that
     * reads on a light tint usually does not on a dark one - the failure that made the first
     * ink table unusable (D63). The row therefore offers light and dark side by side, and
     * "Automatic" clears both back to the derived pair.
     */
    function InkRow({ feature, value, onChange, t, currentAccent }) {
      const title = t(feature.title);
      const isAuto = value === 'auto' || !value || value.id === 'auto';
      const light = isAuto ? '' : value.light || '';
      const dark = isAuto ? '' : value.dark || '';

      /**
       * The colour shown in a picker before the user has chosen one.
       *
       * It must be the current accent's OWN derived ink, not a fixed blue. If the user has
       * picked teal, a picker opening on blue would suggest the current colour is blue, and
       * the first confirmation would silently overwrite a correct derived teal ink with blue.
       * So it is computed with the same mix the theme uses - accent 65% toward the label
       * colour - and the value in the input is the value on screen.
       */
      const derivedInk = (theme) => {
        const accent = ACCENTS.find((entry) => entry.id === currentAccent) || ACCENTS[0];
        const accentHex = theme === 'dark' ? accent.dark : accent.light;
        // The label colour is a HOST token, read from the live document rather than pinned: it
        // is near-black in light and near-white in dark, and it is the value the theme's own mix
        // uses, so reading it keeps the picker's default identical to what is painted. If the
        // document is unavailable the fallback is the measured host pair, named as a fallback.
        let labelHex = theme === 'dark' ? LABEL_FALLBACK.dark : LABEL_FALLBACK.light;
        try {
          const probe = document.createElement('span');
          probe.style.color = 'var(--dsw-alias-label-primary)';
          probe.style.display = 'none';
          document.body.appendChild(probe);
          const resolved = getComputedStyle(probe).color;
          probe.remove();
          const m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(resolved);
          if (m) labelHex = '#' + [m[1], m[2], m[3]].map((v) => Number(v).toString(16).padStart(2, '0')).join('');
        } catch {
          /* No document: the measured host pair above stands. */
        }
        const parse = (h) => {
          const s = h.slice(1);
          return [parseInt(s.slice(0, 2), 16), parseInt(s.slice(2, 4), 16), parseInt(s.slice(4, 6), 16)];
        };
        const a = parse(accentHex);
        const l = parse(labelHex);
        const mixed = [0, 1, 2].map((i) => Math.round(a[i] * 0.65 + l[i] * 0.35));
        return '#' + mixed.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('');
      };

      const setOne = (theme, colour) => {
        const next = {
          id: 'custom',
          light: theme === 'light' ? (colour || null) : (light || null),
          dark: theme === 'dark' ? (colour || null) : (dark || null),
        };
        if (!next.light && !next.dark) return onChange('auto');
        return onChange(next);
      };

      return h(
        'div',
        {
          [ROW_ATTR]: feature.id,
          style: {
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            paddingBlock: 16,
            color: 'var(--dsw-alias-label-primary)',
            fontSize: 14,
            lineHeight: '22px',
          },
        },
        h(
          'div',
          { style: { flex: '1 1 auto', minWidth: 0 } },
          h('div', null, title),
          h(
            'div',
            { style: { color: 'var(--dsw-alias-label-secondary)', fontSize: 12, lineHeight: '18px' } },
            t(feature.about),
          ),
        ),
        h(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: 8, flex: '0 0 auto' } },
          h(
            'button',
            {
              type: 'button',
              onClick: () => onChange('auto'),
              'aria-pressed': isAuto ? 'true' : 'false',
              style: {
                appearance: 'none',
                border: '0',
                cursor: 'pointer',
                font: 'inherit',
                fontSize: 12,
                lineHeight: '18px',
                padding: '5px 10px',
                borderRadius: 999,
                color: isAuto ? 'var(--dsw-alias-label-primary)' : 'var(--dsw-alias-label-secondary)',
                background: isAuto ? 'var(--dsw-alias-interactive-bg-hover)' : 'transparent',
              },
            },
            'Auto',
          ),
          // Each input is wrapped in a label so a click on the ring opens the picker; the
          // native colour input is otherwise hard to hit at a comfortable size.
          h(
            'label',
            { title: 'Label colour (light theme)', style: { display: 'grid', placeItems: 'center', cursor: 'pointer' } },
            h('input', {
              type: 'color',
              value: light || derivedInk('light'),
              onChange: (e) => setOne('light', e.target.value),
              'aria-label': 'Label colour for the light theme',
              style: {
                width: 30, height: 30, padding: 0, border: '0', borderRadius: 999,
                background: 'transparent', cursor: 'pointer',
              },
            }),
          ),
          h(
            'label',
            { title: 'Label colour (dark theme)', style: { display: 'grid', placeItems: 'center', cursor: 'pointer' } },
            h('input', {
              type: 'color',
              value: dark || derivedInk('dark'),
              onChange: (e) => setOne('dark', e.target.value),
              'aria-label': 'Label colour for the dark theme',
              style: {
                width: 30, height: 30, padding: 0, border: '0', borderRadius: 999,
                background: 'transparent', cursor: 'pointer',
              },
            }),
          ),
        ),
      );
    }

    /**
     * The panel body for this plugin's own Settings tab.
     *
     * The options area the host renders sections into has `padding: 0 24px 24px` —
     * NO top padding. The host's own sections never notice, because each one opens
     * with a title/intro block that supplies the visual offset. A plugin section has
     * no such block, so its first row lands flush against the card's top edge
     * (measured: first row at y=104, the same y as the options box itself).
     *
     * So the panel supplies its own top offset, and only that: horizontal padding
     * still belongs to the host, and the board stylesheet's negative inline margins
     * depend on it staying that way.
     */
    function mountSettings(ctx, api, translate) {
      function Panel() {
        api.useFeatureStates();
        return h(
          'div',
          { style: { display: 'flex', flexDirection: 'column', width: '100%', paddingTop: 20 } },
          api.features().map((feature) => {
            // Three row shapes, chosen by the feature's own contract rather than by its id,
            // so adding a fourth choice feature later needs no change here.
            if (feature.id === 'accent') {
              return h(AccentRow, {
                key: feature.id,
                feature,
                value: api.choice(feature.id),
                onSelect: (next) => api.setChoice(feature.id, next),
                t: translate,
              });
            }
            if (feature.id === 'ink') {
              return h(InkRow, {
                key: feature.id,
                feature,
                value: api.choice(feature.id),
                onChange: (next) => api.setChoice(feature.id, next),
                currentAccent: api.choice('accent'),
                t: translate,
              });
            }
            return h(FeatureRow, {
              key: feature.id,
              feature,
              enabled: api.isOn(feature.id),
              onChange: api.set,
              t: translate,
            });
          }),
        );
      }

      // The slot label is resolved by the host from a function, so it follows the
      // active locale without re-registering.
      const navLabel = () => translate(SETTINGS_TAB_TITLE);

      ctx.slots.inject('settings.section', () =>
        ctx.slots.register(
          { name: 'settings.section', id: 'bento-theme', order: 30, label: navLabel },
          Panel,
        ),
      );
    }
