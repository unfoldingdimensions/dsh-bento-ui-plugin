/**
 * Feature: composer chips.
 *
 * The composer's bottom row holds four controls: an attach button, the access-mode
 * selector, the model selector, and Send. Measured with the theme off, they disagree
 * with each other and with the design language:
 *
 *   attach     28x28, fill rgb(245,246,247), radius 999 (a circle)
 *   access     28 tall, transparent, radius 8, padding 0 4px 0 8px
 *   model      28 tall, transparent, radius 8, padding 0 4px 0 8px
 *   Send       34x34, accent fill, radius 999
 *
 * Two of four are circles and two are bare text, at two different heights, with no fill
 * tying the text controls to the button beside them. The result reads as three unrelated
 * fragments rather than one row of one toolbar - which is what "cramped" was describing.
 *
 * WHAT CHANGES
 *   - the two selectors get ONE fill and ONE radius, so the row has a single silhouette
 *     instead of a circle beside bare text;
 *   - their internal gap grows, so label, value and chevron stop running together;
 *   - the model's effort suffix ("High") is promoted from --dsw-alias-label-caption, which
 *     measured 1.83:1 against the composer's canvas - 2.7 below AA - to the secondary
 *     label. That is a readability fix, not a taste one.
 *
 * WHAT DOES NOT CHANGE
 *   - Send keeps its accent fill and its circle: it is the row's primary action and is
 *     meant to be the odd one out. Rounding it to the row's radius would flatten the one
 *     element that carries emphasis.
 *   - No control changes size. Touch targets stay as the host set them; this feature is
 *     about how the row reads, not about making it taller.
 *   - The attach button already had this radius and this fill. Measured for reference only;
 *     it is not restyled, because it was never the mismatch.
 *
 * STABLE HOOKS. The two selectors carry host-written `data-slot` attributes
 * (`conversation.input.model`, `conversation.input.permission`), so they are addressed
 * without a CSS-module hash. The effort suffix is matched on its role fragment, the same
 * structural approach used for the stats strip's pills and the Settings tile renderers.
 *
 * WHY A SETTING. The row is the most-repeated surface in the product. Someone who works
 * mostly in the composer may want the chips visible and grouped; someone who wants the
 * input to recede gets the host's quieter treatment back by switching this off.
 */
    const COMPOSER_CHIPS_CSS = `
/* THE CHIPS: one fill, one radius, one internal rhythm for both selectors.
 *
 * The fill is the token the attach button already resolved to (the host paints it
 * rgb(245,246,247)), reached through the alias rather than copied, so light, dark and any
 * registered theme follow.
 *
 * Radius is the 12px inner tier. A 28px control at 12px reads as a rounded rectangle -
 * a chip - while the circle it replaces read as a badge. It is stated through the token so
 * a later change to the scale moves the chips with it. */
html[${ROOT_ATTR}] [data-slot="conversation.input.model"] button,
html[${ROOT_ATTR}] [data-slot="conversation.input.permission"] button {
  border-radius: var(--dsh-bento-radius-inner);
  background: var(--dsw-alias-bg-module-platform);
  color: var(--dsw-alias-label-secondary);
  gap: calc(var(--dsh-bento-gap) - 1px);
  padding: 0 8px;
  font-weight: 500;
}

/* Hover stays inside the control that was hovered: the host washes the whole row, which on
 * a filled chip reads as the fill disappearing. One step off the chip's own fill instead. */
html[${ROOT_ATTR}] [data-slot="conversation.input.model"] button:hover,
html[${ROOT_ATTR}] [data-slot="conversation.input.permission"] button:hover {
  background: var(--dsw-alias-interactive-bg-hover-solid);
}

/* THE EFFORT SUFFIX.
 *
 * The contrast fix. Measured before: "High" resolved to rgb(173,178,184) -
 * --dsw-alias-label-caption - giving 1.83:1 against the composer canvas. AA asks 4.5:1 at
 * this size, so it was unreadable rather than merely quiet. Promoted to the secondary label,
 * which measures 4.98:1 against the canvas and higher against the chip's lighter fill.
 *
 * Kept secondary by WEIGHT, not by washing it out: 400 against the label's 500. */
html[${ROOT_ATTR}] [data-slot="conversation.input.model"] button [class*="Effort"] {
  color: var(--dsw-alias-label-secondary);
  font-weight: 400;
}

/* The chevron is decoration on a control already labelled by its text. Drawing it at the
 * label's own ink makes it compete with the value; one step lighter keeps it as an
 * affordance rather than a third piece of content. */
html[${ROOT_ATTR}] [data-slot="conversation.input.model"] button [class*="chevron"],
html[${ROOT_ATTR}] [data-slot="conversation.input.permission"] button [class*="chevron"] {
  color: var(--dsw-alias-label-tertiary);
}
`;

    FEATURES.push({
      id: 'composer-chips',
      title: { en: 'Composer controls', zh: '输入栏控件' },
      about: {
        en: 'Give the model and access selectors one shared fill and radius, and make the reasoning-effort suffix readable.',
        zh: '让模型与权限选择器共用同一底色和圆角，并让推理档位文字清晰可读。',
      },
      order: 26,
      enabled: true,
      css: COMPOSER_CHIPS_CSS,
    });
