/**
 * The accent palette.
 *
 * Each accent carries the two values the host itself distinguishes: a light-theme accent and a
 * dark-theme accent for the same identity. The host's own accent is #4176e6 in light and
 * #7aaaff in dark - the same hue, lightened for a dark ground - so the palette follows that
 * shape rather than pinning one literal for both.
 *
 * NO PAIRED INK TABLE IS NEEDED, AND THAT WAS MEASURED, NOT ASSUMED.
 *
 * The obvious design is per-accent text colours: light ink, dark ink, sixteen values, sixteen
 * chances to be wrong. The theme already derives the selection ink from whatever accent is
 * live - a 12% tint for the fill and a 65% mix toward the label for the ink (D55) - so
 * overriding the accent token moves the ink with it. The question was whether that derivation
 * stays readable for accents other than blue.
 *
 * Computed against the theme's actual mixes for all eight accents in both themes:
 *
 *   worst ink-on-tint contrast:  5.90:1  (teal / light)
 *   worst accent-as-icon:        3.74:1  (teal / light)
 *
 * AA asks 4.5:1 for text and 3:1 for a UI element. Every accent clears both, so the ink is
 * derived and there is nothing to hand-maintain. A per-accent ink table was written first and
 * discarded: its two "tricky" entries (amber and rose, where a dark ink on a dark tint is the
 * wrong instinct) measured 1.20:1 and 1.24:1 - unreadable. The derivation is right and the
 * invented table was wrong, which is why the numbers are computed here rather than chosen.
 *
 * THE USER CAN OVERRIDE THE INK ANYWAY. "Each accent comes with its own text colour, but we
 * need the ability to change it as well" is two requirements: a correct default pair, and a
 * way to depart from it. The default is free (derived); the departure is a stored value that,
 * when set, replaces the derivation for that theme.
 *
 * THESE HEX VALUES ARE THE ONLY LITERALS IN THE PLUGIN. That is deliberate and it is why the
 * no-hardcoded-colour gate exempts this file by name: a palette is data the user is picking
 * from, not a surface that should follow the theme. Every other colour in the plugin still
 * resolves through a host token.
 *
 * CONTRAST IS ASSERTED, NOT TRUSTED. `verify.mjs` recomputes the whole table and fails if any
 * accent's derived ink drops below AA or its icon below 3:1, so adding a ninth accent is a
 * change that either proves itself or breaks the build.
 */
    const ACCENTS = [
      { id: 'blue',   label: { en: 'Blue',   zh: '蓝色'  }, light: '#4176e6', dark: '#7aaaff' },
      { id: 'indigo', label: { en: 'Indigo', zh: '靛蓝'  }, light: '#5b5bd6', dark: '#a5a5f5' },
      { id: 'violet', label: { en: 'Violet', zh: '紫罗兰' }, light: '#8b5cf6', dark: '#c4a6ff' },
      { id: 'teal',   label: { en: 'Teal',   zh: '青绿'  }, light: '#0d9488', dark: '#5eead4' },
      { id: 'green',  label: { en: 'Green',  zh: '绿色'  }, light: '#15803d', dark: '#6ee7a0' },
      { id: 'amber',  label: { en: 'Amber',  zh: '琥珀'  }, light: '#b45309', dark: '#fbbf24' },
      { id: 'rose',   label: { en: 'Rose',   zh: '玫红'  }, light: '#be123c', dark: '#fb7185' },
      { id: 'slate',  label: { en: 'Slate',  zh: '石板灰' }, light: '#475569', dark: '#94a3b8' },
    ];

    /** The default when the user has never chosen. Blue is the host's own accent. */
    const DEFAULT_ACCENT = 'blue';


    /**
     * The host's label colour, as a fallback only.
     *
     * `derivedInk` in the Settings renderer reads the live `--dsw-alias-label-primary` so the
     * colour picker opens on exactly what is painted. These two values are what it falls back
     * to when there is no document to read (the gate's own math runs headless, and the palette
     * gate needs a label colour to derive against). They are the host's measured values, not
     * choices: #0f1115 light, #f5f6f7 dark.
     */
    const LABEL_FALLBACK = { light: '#0f1115', dark: '#f5f6f7' };