/**
 * Feature: a quiet status row at the sidebar foot (D71).
 *
 * Phase 3 of the reference, and a deliberate departure from it. The reference's footer is:
 *
 *   [avatar]  Signed in to DeepSeek          516M today
 *
 * Three parts, and only two of them are reproducible:
 *
 *   avatar + label   a shape, not a fact
 *   "516M today"     NOT POSSIBLE. The feasibility report established that no token, balance or
 *                    currency figure reaches a client plugin: measured, the DOM holds none, and the
 *                    client API exposes no usage service. That part is refused rather than faked.
 *
 * So the row keeps the reference's COMPOSITION - a small round mark, a label, one muted figure -
 * and fills it with state this plugin actually owns:
 *
 *   [accent dot]  Bento layout              11 of 12 on
 *
 * The mark is the user's chosen accent, so the footer doubles as a quiet confirmation of which
 * accent is active, which is otherwise only visible where the accent happens to be used. The figure
 * is a real count read from the kernel, so it cannot claim a feature that is switched off:
 * switching one off changes the number, and that is verified.
 *
 * WHY THE FOOTER AND NOT A NEW PANEL. The slot is documented as "Optional actions BESIDE Settings at
 * the sidebar foot", kind: list, scope: root, and it passes exactly one prop. A single short row is
 * exactly that shape; a taller panel would be a feature the slot was not designed for.
 *
 * COLLAPSED RAIL. The host passes `wide: false` in the 56px rail, where a label and a count cannot
 * fit. The row renders null there rather than shrinking: the rail already shows the accent through
 * the selected nav row, and a 56px strip holding a truncated word is worse than nothing. This is a
 * render decision, not a CSS one, so the rail's DOM stays untouched.
 *
 * STYLES LIVE IN THE STYLESHEET, NOT INLINE. Every other feature in this plugin paints through
 * `BASE_CSS` + a feature CSS block, which is what makes the token layer, the reduced-motion rules
 * and gate 15 apply. Inline styles would bypass all three, so this row is styled by class like
 * everything else and the renderer only carries data.
 */
    /** Locale copy for the row, declared once so the label and its title cannot drift. */
    const STATUS_TEXT = {
      en: { label: 'Bento layout', off: 'Off', on: 'on', of: 'of', title: 'Bento layout: {n} of {m} pieces on' },
      zh: { label: '便当布局', off: '已关闭', on: '开', of: '/', title: '便当布局：{m} 项中开启 {n} 项' },
    };

    const STATUS_CSS = `
/* THE SIDEBAR STATUS ROW (D71).
 *
 * A list slot entry draws its own chrome, so this is the row's whole appearance. It is deliberately
 * quiet: the sidebar foot already holds the Settings trigger, and two loud rows stacked would read
 * as two primary actions.
 *
 * The host's own seat is the footerActions row (flex, full width, above the settings area), so this
 * row simply fills it. No margin is declared on the outside - the seat's own column padding already
 * aligns it with the Settings row below, and adding margin here would put the two rows on different
 * left edges. */
html[${ROOT_ATTR}] [class*="footerActions"] [data-bento-status] {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  min-width: 0;
  min-height: 34px;
  padding: 0 8px;
  border-radius: var(--dsh-bento-radius-inner);
  color: var(--dsw-alias-label-primary);
  font-size: 13px;
  line-height: 18px;
}

/* The accent dot carries the user's chosen accent, so it reads as identity rather than decoration.
   The inset hairline keeps a pale accent (amber) visible against a white card. */
html[${ROOT_ATTR}] [class*="footerActions"] [data-bento-status] > [data-bento-accent-dot] {
  flex: none;
  width: 10px;
  height: 10px;
  border-radius: var(--dsh-bento-radius-pill);
  background: var(--dsw-alias-state-business-primary);
  box-shadow: inset 0 0 0 1px var(--dsh-bento-edge);
}

html[${ROOT_ATTR}] [class*="footerActions"] [data-bento-status] > .dsh-bento-status-label {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

html[${ROOT_ATTR}] [class*="footerActions"] [data-bento-status] > .dsh-bento-status-figure {
  flex: none;
  font-size: 11px;
  color: var(--dsw-alias-label-secondary);
  white-space: nowrap;
  font-variant-numeric: tabular-nums;
}
`;

    /**
     * Mount the footer row.
     *
     * This is a `list` slot, so several packages can contribute rows. The order puts this one below
     * any other package's action rather than above it: the footer is the host's chrome, and a theme
     * should not take the position closest to Settings away from a package that has a real control
     * to offer there.
     */
    function mountSidebarStatus(ctx, api, translate) {
      function StatusRow(props) {
        // Re-render when any feature is toggled, so the count cannot go stale.
        api.useFeatureStates();

        // The slot passes exactly one prop: `wide`. Confirmed from the host's own render call -
        // renderSlot("sidebar.footer.action", { wide }) - rather than guessed, because a component
        // reading the wrong key would render in the 56px rail as if it were expanded.
        const wide = !(props && props.wide === false);

        if (!api.isOn('sidebar-status')) return null;
        if (!wide) return null;

        const t = translate(STATUS_TEXT);

        // Count only switch features. A `choice` feature (accent, label colour) has no on/off state,
        // so including it would make the denominator wrong by however many choices ship.
        const switches = api.features().filter((f) => !f.choice);
        const on = switches.filter((f) => api.isOn(f.id)).length;
        const total = switches.length;

        const accent = api.choice('accent');
        const figure = on === 0 ? t.off : on + ' ' + t.of + ' ' + total + ' ' + t.on;
        const title = String(t.title).replace('{n}', String(on)).replace('{m}', String(total));

        return h(
          'div',
          {
            className: 'dsh-bento-status',
            'data-bento-status': '',
            'data-bento-accent-dot': accent || 'auto',
            title,
          },
          // The dot is the reference's avatar slot, filled with something true: the accent in use.
          h('span', { 'aria-hidden': true, 'data-bento-accent-dot': accent || 'auto' }),
          h('span', { className: 'dsh-bento-status-label' }, t.label),
          h('span', { className: 'dsh-bento-status-figure' }, figure),
        );
      }

      ctx.slots.inject('sidebar.footer.action', () =>
        ctx.slots.register(
          { name: 'sidebar.footer.action', id: 'bento-status', order: 90, label: () => translate(STATUS_TEXT).label },
          StatusRow,
        ),
      );
    }

    FEATURES.push({
      id: 'sidebar-status',
      title: { en: 'Sidebar status row', zh: '侧栏状态行' },
      about: {
        en: 'A quiet row at the sidebar foot showing the active accent and how many pieces of the layout are on. Hidden in the collapsed rail.',
        zh: '在侧栏底部显示当前强调色与已开启的布局项目数；侧栏收起时隐藏。',
      },
      order: 18,
      enabled: true,
      css: STATUS_CSS,
    });
