/**
 * Footer: the translator, kernel start-up, and the plugin's export shape.
 *
 * Order matters here. The settings row is registered first, because it is the
 * only part of this plugin the user needs in order to turn the theme off. If any
 * later step throws (DOM work, a stylesheet, an observer), a row that is already
 * registered still leaves the user one switch to click.
 *
 * `apply` never mutates `ctx` and never lets a failure escape. Both matter:
 * a Cordis context is framework-owned (writing an ad-hoc property onto it is not
 * a supported operation and can throw), and the client module system treats a
 * throw out of `apply` as "this plugin failed", which is exactly the failure
 * mode that hid this plugin's settings row entirely.
 */
    /**
     * Copy is declared on each feature as an `{ en, zh }` pair and resolved
     * through the host's active locale at call time, so switching language
     * needs no re-registration. A language without a copy falls back to English
     * rather than showing a missing key.
     */
    function makeTranslator(ctx) {
      return function translate(pair) {
        const active = ctx.locale.getLocale().active;
        return pair[active] ?? pair.en;
      };
    }

    function report(ctx, where, error) {
      // A broken theme must never be silent, but it also must never be fatal.
      try {
        ctx.logger?.error?.(`dsh-bento-theme: ${where} failed:`, error);
      } catch {
        /* logging is best-effort */
      }
      console.error(`dsh-bento-theme: ${where} failed:`, error);
    }

    function apply(ctx) {
      // Locals only. `ctx` belongs to the framework; assigning a helper onto it
      // is not supported and is not needed — pass it down instead.
      let translate = (pair) => pair && pair.en;

      try {
        translate = makeTranslator(ctx);
      } catch (error) {
        report(ctx, 'locale', error);
      }

      let kernel = null;
      try {
        kernel = createKernel(ctx);
      } catch (error) {
        report(ctx, 'kernel', error);
      }

      // 1. The switch, first and in its own guard.
      try {
        if (kernel !== null) mountSettings(ctx, kernel.api, translate);
      } catch (error) {
        report(ctx, 'settings', error);
      }

      // 2. Everything visual, guarded separately so it cannot undo step 1.
      try {
        if (kernel !== null) kernel.start();
      } catch (error) {
        report(ctx, 'kernel.start', error);
      }

      // 3. The plugin detail page's extra sections (D70).
      //
      // LAST, and in its own guard, for the same reason as the switch: this is the only part of
      // the plugin that mounts DOM into a host surface it does not own. If the slot contract
      // changes, or the host stops offering 'plugins.detail.section', that failure must not take
      // the theme's stylesheets down with it - the theme would lose its whole look because a
      // section could not be added.
      try {
        if (kernel !== null) mountDetailSections(ctx, kernel.api, translate);
      } catch (error) {
        report(ctx, 'detail sections', error);
      }
    }

    return { inject: ['slots', 'locale'], apply };
  },
});
