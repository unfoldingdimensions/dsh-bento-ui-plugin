// Module envelope. Everything between here and 99-footer.js is factory scope:
// fragments share one lexical scope, so a `const` declared in one is visible in
// the next. Keep names unique across fragments.
window.__ModuleLoader__.load({
  id: 'dsh-bento-theme',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    /** The document attribute that switches the whole theme on. */
    const ROOT_ATTR = 'data-dsh-bento';
    /** Marks a shell element with the role the stylesheets address. */
    const PART_ATTR = 'data-dsh-bento-part';
    const STYLE_ID = 'dsh-bento-theme-css';
    const STORAGE_KEY = 'dsh-bento-theme:enabled';

    /**
     * Shell roles a feature may address. These are this plugin's own names for
     * the shell's regions, not host attributes: the host's column wrappers carry
     * CSS-module class names that are hashed per build (`mP3x-q_sidebarCol` in
     * this build), so a stylesheet cannot name them. The kernel locates the
     * regions structurally once and stamps these roles onto them.
     */
    const PART = {
      FRAME: 'frame',
      SIDEBAR: 'sidebar',
      CENTER: 'center',
      RIGHTBAR: 'rightbar',
    };

    /**
     * The label of this plugin's own Settings tab. Declared once and used for both
     * the nav entry and the rows' heading, so the two can never drift.
     */
    const SETTINGS_TAB_TITLE = { en: 'Bento layout', zh: '便当布局' };
    /**
     * Marks a row this plugin renders in its own Settings tab, so the stylesheet can
     * address it without a hashed class name and without depending on which section
     * it landed in.
     *
     * DECLARED HERE, NOT WHERE IT IS USED. Fragments are concatenated in filename
     * order and share one scope, so a const is only initialised once its own
     * fragment has run. This constant was first declared in 60-settings.js while
     * being read by 50-feature-settings.js, which runs earlier - the stylesheet
     * string is built at module scope, so it threw
     * "Cannot access 'ROW_ATTR' before initialization" during import and took the
     * plugin's activation down. Anything used at module scope by a lower-numbered
     * fragment belongs here.
     */
    const ROW_ATTR = 'data-dsh-bento-row';

