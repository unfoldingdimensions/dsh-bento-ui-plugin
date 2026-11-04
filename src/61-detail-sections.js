/**
 * Feature: two extra sections on the plugin detail page (D70).
 *
 * Phase 2 of the reference. Phase 1 restyled the page from CSS alone; this mounts content, which
 * makes it the first part of this theme that adds DOM rather than repainting the host's.
 *
 * THE EXTENSION POINT, from the client runner's own slot contract catalog (not from inference):
 *
 *   plugins.detail.section   kind: list   scope: root
 *   "Sections under a detail page's own content... An entry draws its own section chrome and
 *    renders null for a subject it has nothing for."
 *
 * So a section is genuinely ours to draw - chrome included - and each entry receives the page's
 * `subject`. The registration call is the documented one:
 *
 *   ctx.slots.inject('plugins.detail.section', () => ctx.slots.register(
 *     { name: 'plugins.detail.section', id, order, label },
 *     Component,
 *   ))
 *
 * WHAT THE SUBJECT ACTUALLY CARRIES, measured from the plugin-manager's `packageRef`:
 *
 *   { kind: 'bundle', pkg: { name, version?, installed, availability, official, enabled,
 *                            rows: [{ rowId, moduleName, enabled }] } }
 *   { kind: 'item',   id }                                        (official plugin pages)
 *
 * THAT IS THE WHOLE DELTA, AND IT BOUNDS THIS FEATURE HONESTLY. The reference shows a Source card
 * with the install path and an Update tile with a "check for updates" action. Neither is reachable:
 * the subject omits `pkg.source` and `pkg.installTarget`, which are exactly the two fields the
 * host's own `updateAvailable()` and `SourceSection` read. Registering a tile that claimed to check
 * for updates would be a button that cannot know anything, so it is not built.
 *
 * What IS real and worth showing: the package's kind, its availability, whether it is official, its
 * row/component breakdown, and its enabled state. Those are the facts the host hands over, and they
 * are the ones a reader of a plugin page actually wants next to the host's own summary.
 *
 * CACHED, NOT PRE-FETCHED. Two sections render on every detail page for every plugin, so the
 * component must be cheap. It is a pure render of the subject - no effects, no subscriptions, no
 * timers - and it returns null for a subject it does not understand, which is what the contract
 * asks for.
 */
    /** Locale keys for the panel, declared once so the row and both sections cannot drift. */
    const DETAIL_SECTION_TEXT = {
      en: {
        facts: 'Package facts',
        kind: 'Kind',
        status: 'Status',
        source: 'Source',
        components: 'Components',
        enabled: 'Enabled',
        rowsLabel: 'row',
        rowsLabelPlural: 'rows',
        kindBundle: 'Bundle',
        kindItem: 'Official plugin',
        installed: 'Installed',
        available: 'Not installed',
        missing: 'Files missing',
        yes: 'Yes',
        no: 'No',
        official: 'Official',
        thirdParty: 'Third-party',
        linked: 'Linked from a local folder',
        sectionTitle: 'Bento layout',
        sectionAbout: 'How this page is composed',
        boardHero: 'Hero panel',
        boardHeroAbout: 'The title block, raised on its own panel with an accent hairline.',
        boardCells: 'Section cells',
        boardCellsAbout: 'Host sections laid out as cells on a two-track grid.',
        pillCrumb: 'Pill breadcrumb',
        pillCrumbAbout: 'The back link, restyled as a pill with a 30px target.',
        agePill: 'Session age pills',
        agePillAbout: 'Session ages in the sidebar become chips.',
        on: 'On',
        off: 'Off',
        state: 'State',
        version: 'Version',
      },
      zh: {
        facts: '包信息',
        kind: '类型',
        status: '状态',
        source: '来源',
        components: '组件',
        enabled: '已启用',
        rowsLabel: '个',
        rowsLabelPlural: '个',
        kindBundle: '整合包',
        kindItem: '官方插件',
        installed: '已安装',
        available: '未安装',
        missing: '文件缺失',
        yes: '是',
        no: '否',
        official: '官方',
        thirdParty: '第三方',
        linked: '从本地文件夹链接',
        sectionTitle: '便当布局',
        sectionAbout: '此页面的排版方式',
        boardHero: '标题面板',
        boardHeroAbout: '标题区抬起为独立面板，并带强调色细线。',
        boardCells: '分区卡片',
        boardCellsAbout: '宿主分区以两栏网格排列为卡片。',
        pillCrumb: '胶囊面包屑',
        pillCrumbAbout: '返回链接改为胶囊样式，点击区域 30px。',
        agePill: '会话时间胶囊',
        agePillAbout: '侧栏中的会话时间变为胶囊标签。',
        on: '开',
        off: '关',
        state: '状态',
        version: '版本',
      },
    };

    /**
     * Build the two detail sections. Returns a disposer.
     *
     * Both sections are mounted as separate slot entries rather than one wrapper, because the
     * contract's `order` places each independently and a single entry could not sit at two
     * different positions relative to the host's own content.
     */
    function mountDetailSections(ctx, api, translate) {
      const tone = (label, value) =>
        h(
          'div',
          {
            style: {
              display: 'grid',
              gridTemplateColumns: 'minmax(120px, 34%) 1fr',
              gap: '4px 12px',
              alignItems: 'baseline',
              padding: '5px 0',
              fontSize: 13,
              lineHeight: '18px',
            },
          },
          h('span', { style: { color: 'var(--dsw-alias-label-secondary)' } }, label),
          h('span', { style: { color: 'var(--dsw-alias-label-primary)', minWidth: 0, overflowWrap: 'anywhere' } }, value),
        );

      // ---- Section 1: package facts
      function FactsSection(props) {
        api.useFeatureStates();
        const subject = props && props.subject;
        if (!subject || !subject.kind) return null;
        if (!api.isOn('detail-board')) return null;

        const t = translate(DETAIL_SECTION_TEXT);
        const pkg = subject.pkg;
        const isItem = subject.kind === 'item';

        // For an official plugin page the subject is only { kind, id }; there is no package to
        // describe, so this section says nothing rather than inventing facts about it.
        if (isItem && !pkg) return null;

        const rows = (pkg && Array.isArray(pkg.rows)) ? pkg.rows : [];
        const enabledRows = rows.filter((r) => r.enabled).length;

        const status = !pkg
          ? t.available
          : pkg.availability === 'missing'
            ? t.missing
            : pkg.installed
              ? t.installed
              : t.available;

        const facts = [
          [t.kind, isItem ? t.kindItem : t.kindBundle],
          [t.status, status],
          [t.source, pkg && pkg.official ? t.official : t.thirdParty],
        ];
        if (pkg && pkg.version) facts.push([t.version, pkg.version]);
        if (rows.length) facts.push([t.components, enabledRows + ' / ' + rows.length]);
        if (pkg) facts.push([t.enabled, pkg.enabled ? t.yes : t.no]);

        return h(
          'section',
          {
            // The contract says an entry draws its own chrome; this class is what the stylesheet
            // in 48b addresses, so the section matches the host's own cells.
            className: 'dsh-bento-detail-section',
            'data-bento-detail': 'facts',
          },
          h('h4', { className: 'dsh-bento-detail-section-title' }, t.facts),
          h('div', { style: { display: 'flex', flexDirection: 'column' } }, facts.map(([k, v]) => tone(k, v))),
        );
      }

      // ---- Section 2: what the theme did to this page
      //
      // This is the honest answer to the reference's "components" idea at page scale: it lists the
      // mechanisms in effect, read from the kernel's own feature state, so it cannot claim a
      // feature that is switched off.
      function BoardSection(props) {
        api.useFeatureStates();
        const subject = props && props.subject;
        if (!subject || !subject.kind) return null;
        if (!api.isOn('detail-board')) return null;

        const t = translate(DETAIL_SECTION_TEXT);
        const items = [
          ['boardHero', 'boardHeroAbout', api.isOn('detail-board')],
          ['boardCells', 'boardCellsAbout', api.isOn('detail-board')],
          ['pillCrumb', 'pillCrumbAbout', api.isOn('detail-board')],
          ['agePill', 'agePillAbout', api.isOn('row-tiles')],
        ];

        return h(
          'section',
          {
            className: 'dsh-bento-detail-section',
            'data-bento-detail': 'board',
          },
          h('h4', { className: 'dsh-bento-detail-section-title' }, t.sectionTitle),
          h(
            'div',
            { style: { display: 'flex', flexDirection: 'column' } },
            items.map(([nameKey, aboutKey, on]) =>
              h(
                'div',
                {
                  key: nameKey,
                  style: {
                    display: 'grid',
                    gridTemplateColumns: '1fr auto',
                    gap: '2px 10px',
                    padding: '7px 0',
                    borderTop: '1px solid var(--dsw-alias-border-l2)',
                    opacity: on ? 1 : 0.55,
                  },
                },
                h(
                  'div',
                  { style: { display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 } },
                  h('span', { style: { fontSize: 13, fontWeight: 500, color: 'var(--dsw-alias-label-primary)' } }, t[nameKey]),
                  h('span', { style: { fontSize: 12, lineHeight: '18px', color: 'var(--dsw-alias-label-secondary)' } }, t[aboutKey]),
                ),
                h(
                  'span',
                  { style: { fontSize: 12, fontWeight: 500, color: on ? 'var(--dsw-alias-label-primary)' : 'var(--dsw-alias-label-secondary)', whiteSpace: 'nowrap' } },
                  on ? t.on : t.off,
                ),
              ),
            ),
          ),
        );
      }

      // `order` places each relative to the host's own content. The facts sit first because they
      // continue the page's summary; the board note sits last because it describes the page itself.
      ctx.slots.inject('plugins.detail.section', () =>
        ctx.slots.register(
          { name: 'plugins.detail.section', id: 'bento-facts', order: 10, label: () => translate(DETAIL_SECTION_TEXT).facts },
          FactsSection,
        ),
      );
      ctx.slots.inject('plugins.detail.section', () =>
        ctx.slots.register(
          { name: 'plugins.detail.section', id: 'bento-board', order: 20, label: () => translate(DETAIL_SECTION_TEXT).sectionTitle },
          BoardSection,
        ),
      );
    }
