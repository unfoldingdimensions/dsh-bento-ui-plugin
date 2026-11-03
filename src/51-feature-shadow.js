/**
 * Feature: card shadow.
 *
 * A card can be defined by its border alone, or by a border plus a lift. This feature
 * adds the lift and nothing else, as an OPT-IN, because the two readings are a taste
 * decision rather than a correction: a flat board with hairline edges is a legitimate
 * look, and so is a softly raised one. The reference screenshots use the raised one.
 *
 * WHY A SEPARATE FEATURE RATHER THAN PART OF THE CARDS. The four card surfaces belong
 * to four different features (sidebar, centre, right panel, settings board). Adding a
 * shadow to each of their stylesheets would mean four chances for them to drift, and no
 * way to turn the shadow off without turning a card off. Here the shadow is one rule
 * per surface in one place, and the toggle is the feature registry itself - so it
 * appears in the settings panel with no extra wiring.
 *
 * WHERE THE SHADOW GOES: on the PAINTED PSEUDO-ELEMENT, not on the column. This matters
 * and is the reason the rule is not simply `[part="center"]::after { box-shadow }`.
 * A shadow must follow the same box as the surface, and the surface is the inset
 * rectangle on `::after`, not the full-bleed column. Putting it on the column instead
 * would draw the shadow around the column's own edges - outside the gutter - and the
 * card would appear to float on a larger invisible plate.
 *
 * WHY IT MUST NOT AFFECT LAYOUT: `box-shadow` never does, which is why this feature
 * needs no measurement of the kind the radii and panels did. It cannot move a 1px
 * border, reflow a grid, or change a card's height.
 *
 * NO `overflow: hidden` AND NO `filter`: either would clip the shadow at the column
 * edge, and the columns already scroll their own content.
 */
    const SHADOW_CSS = `
/* The three column cards. Same painted pseudo-element the surface is drawn on, so the
   shadow follows exactly the rounded rectangle the eye reads as the card. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.SIDEBAR}"]::after,
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.CENTER}"]::after,
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.RIGHTBAR}"]::after {
  box-shadow: var(--dsh-bento-shadow);
}

/* The collapsed sidebar narrows to a rail and drops to the rail radius; a shadow drawn
   for a 20px card on a 10px rail reads as a mistake, so the lift is withdrawn there.
   The card still has its hairline, so it does not lose its edge. */
html[${ROOT_ATTR}] [${PART_ATTR}="${PART.FRAME}"][data-sidebar-collapsed] [${PART_ATTR}="${PART.SIDEBAR}"]::after {
  box-shadow: none;
}

/* The Settings board's content card is the same surface at the same 12px inset, so it
   takes the same lift. Its radius is the nested tier (28 - 12), which is why this is a
   separate rule rather than another selector in the list above. */
html[${ROOT_ATTR}] [data-shortcut-modal="settings"] > div:has([data-slot="settings.section"])::before {
  box-shadow: var(--dsh-bento-shadow);
}
`;

    FEATURES.push({
      id: 'card-shadow',
      title: { en: 'Card shadow', zh: '卡片投影' },
      about: {
        en: 'Lift the cards off the canvas with a soft two-layer shadow. Off keeps the flat board.',
        zh: '用两层柔和阴影把卡片从画布上托起。关闭则保持纯平铺。',
      },
      order: 22,
      /* OFF BY DEFAULT. A shadow is a preference, not a fix: the flat board is a
         complete look, and turning this on changes how the whole shell reads. Shipping
         it on would shift every existing user's layout on update for a choice they did
         not make. */
      enabled: false,
      css: SHADOW_CSS,
    });

