/**
 * Kernel: feature registry, shell stamping, stylesheet assembly.
 *
 * A feature is a plain object:
 *
 *   {
 *     id:      stable key; also its storage suffix and its CSS marker
 *     title:   { en, zh } locale title
 *     about:   { en, zh } one-line description
 *     order:   settings row order
 *     enabled: default when the user has made no choice (default true)
 *     css:     string, injected only while the feature is on
 *     setup(ctx, api) -> optional disposer, for a feature with a runtime half
 *   }
 *
 * A feature never queries the DOM and never writes its own stylesheet: the shell
 * stamping and the stylesheet both belong to the kernel, so there is exactly one
 * observer, one style tag, and one place a new shell role is added.
 */

    /** Features self-register here in load order; everything else derives from it. */
    const FEATURES = [];

    /**
     * Stamp the shell's regions with this plugin's role names.
     *
     * The host's column wrappers carry CSS-module class names hashed per build
     * (`mP3x-q_sidebarCol` in this build), so a stylesheet cannot name them, and
     * `single`/`keyed` slots render no `data-slot` anchor. The frame's children
     * are stable in order and its non-column children each self-identify, so the
     * three columns are found by narrowing and then tagged.
     *
     * Idempotent and mutation-quiet: an unchanged tree writes nothing.
     */
    function stampShell() {
      const anchor = document.querySelector('[data-slot="root"]');
      const frame = anchor && anchor.firstElementChild;
      if (!frame) return;

      if (frame.getAttribute(PART_ATTR) !== PART.FRAME) frame.setAttribute(PART_ATTR, PART.FRAME);

      const roles = [PART.SIDEBAR, PART.CENTER, PART.RIGHTBAR];
      let next = 0;
      for (const child of frame.children) {
        if (child.tagName !== 'DIV') continue;
        if (
          child.hasAttribute('data-shell-bottom') ||
          child.hasAttribute('data-shell-overlay') ||
          child.hasAttribute('data-shell-leading') ||
          child.hasAttribute('data-side')
        ) {
          continue;
        }
        const role = roles[next++];
        if (!role) break;
        if (child.getAttribute(PART_ATTR) !== role) child.setAttribute(PART_ATTR, role);
      }
    }

    function unstampShell() {
      for (const el of document.querySelectorAll(`[${PART_ATTR}]`)) el.removeAttribute(PART_ATTR);
    }

    function readStored(feature) {
      const fallback = feature.enabled !== false;
      try {
        const raw = window.localStorage.getItem(`${STORAGE_KEY}:${feature.id}`);
        if (raw === '1') return true;
        if (raw === '0') return false;
        return fallback;
      } catch {
        return fallback;
      }
    }

    function writeStored(feature, value) {
      try {
        window.localStorage.setItem(`${STORAGE_KEY}:${feature.id}`, value ? '1' : '0');
      } catch {
        /* Storage unavailable: the choice lasts for this page only. */
      }
    }

    /**
     * A `choice` feature's stored value.
     *
     * Two shapes are supported, and they are distinguished by the feature, not guessed:
     *   - `options` present  -> the value must be one of their ids (a fixed palette). A stale
     *     id from an older version would otherwise paint nothing, with no visible error, so it
     *     falls back to the default instead of trusting localStorage.
     *   - `store` is 'json'  -> a free-form value (the label colour), parsed and shape-checked.
     *     localStorage is user-writable; a malformed record must not be painted into the
     *     stylesheet as a CSS value.
     */
    function readChoice(feature) {
      const fallback = feature.defaultChoice;
      try {
        const raw = window.localStorage.getItem(`${STORAGE_KEY}:${feature.id}`);
        if (raw === null) return fallback;
        if (feature.store === 'json') {
          let parsed;
          try { parsed = JSON.parse(raw); } catch { return fallback; }
          if (!parsed || typeof parsed !== 'object') return fallback;
          // Only hex colours are accepted. A value that is not a colour would be emitted into
          // the stylesheet verbatim, so the boundary validates rather than sanitising later.
          const isColour = (v) => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v);
          const light = isColour(parsed.light) ? parsed.light : null;
          const dark = isColour(parsed.dark) ? parsed.dark : null;
          if (parsed.id === 'auto') return 'auto';
          if (!light && !dark) return fallback;
          return { id: 'custom', light, dark };
        }
        if (raw === '0' || raw === '1') return fallback;
        if (feature.options && feature.options.some((option) => option.id === raw)) return raw;
        return fallback;
      } catch {
        return fallback;
      }
    }

    function writeChoice(feature, value) {
      try {
        const payload = typeof value === 'object' && value !== null ? JSON.stringify(value) : value;
        window.localStorage.setItem(`${STORAGE_KEY}:${feature.id}`, payload);
      } catch {
        /* Storage unavailable: the choice lasts for this page only. */
      }
    }

    function createKernel(ctx) {
      const state = new Map();
      const listeners = new Set();
      const cleanups = new Map();
      /**
       * Features whose value is a choice rather than a switch (`choice` in the contract).
       * Stored separately from `state` because "which accent" is not a boolean and must not
       * be coerced by `readStored`, which only ever answers true/false.
       */
      const choices = new Map();
      let revision = 0;

      for (const feature of FEATURES) {
        if (feature.choice) choices.set(feature.id, readChoice(feature));
        else state.set(feature.id, readStored(feature));
      }

      const api = {
        isOn(id) {
          return state.get(id) === true;
        },
        /** The stored choice for a `choice` feature, or its declared default. */
        choice(id) {
          return choices.get(id);
        },
        /** Set a `choice` feature's value. Repaints; never touches the on/off state. */
        setChoice(id, value) {
          const feature = FEATURES.find((entry) => entry.id === id);
          if (!feature || !feature.choice) return;
          if (choices.get(id) === value) return;
          choices.set(id, value);
          writeChoice(feature, value);
          api.paint();
          revision += 1;
          for (const listener of listeners) listener();
        },
        revision() {
          return revision;
        },
        set(id, value) {
          if (state.get(id) === value) return;
          const feature = FEATURES.find((entry) => entry.id === id);
          if (!feature) return;
          state.set(id, value);
          writeStored(feature, value);
          api.reconcile(feature);
          api.paintRoot();
          api.paint();
          revision += 1;
          for (const listener of listeners) listener();
        },
        subscribe(listener) {
          listeners.add(listener);
          return () => listeners.delete(listener);
        },
        features() {
          return FEATURES;
        },
        /** One stylesheet for every active feature, over the shared token layer. */
        paint() {
          const existing = document.getElementById(STYLE_ID);
          if (existing) existing.remove();
          // A `choice` feature has no on/off state: its css() is always painted, and what
          // varies is which value it returns. A `css` string feature is painted only while
          // its switch is on. The two contracts are kept separate rather than conflated into
          // "the css is empty when off", so a genuinely empty choice cannot silently disable
          // the whole token layer.
          const blocks = [];
          for (const feature of FEATURES) {
            if (typeof feature.css === 'function') {
              const out = feature.css(api.choice(feature.id));
              if (out) blocks.push(out);
            } else if (api.isOn(feature.id) && feature.css) {
              blocks.push(feature.css);
            }
          }
          if (blocks.length === 0) return;
          const tag = document.createElement('style');
          tag.id = STYLE_ID;
          // BASE_CSS carries the design tokens every feature reads; a feature's
          // own CSS is meaningless without it, so it is always prepended.
          tag.textContent = [BASE_CSS, ...blocks].join('\n');
          document.head.appendChild(tag);
        },
        /** Apply or withdraw a feature's runtime half. */
        reconcile(feature) {
          const pending = cleanups.get(feature.id);
          if (api.isOn(feature.id)) {
            if (pending) return;
            const dispose = typeof feature.setup === 'function' ? feature.setup(ctx, api) : undefined;
            cleanups.set(feature.id, dispose ?? (() => {}));
          } else if (pending) {
            pending();
            cleanups.delete(feature.id);
          }
        },
        /** Any feature on means the document attribute is on. */
        paintRoot() {
          const root = document.documentElement;
          if (FEATURES.some((feature) => api.isOn(feature.id))) root.setAttribute(ROOT_ATTR, '');
          else root.removeAttribute(ROOT_ATTR);
        },
      };

      // The React hook lives here so a feature's row cannot subscribe wrongly.
      api.useFeatureStates = function useFeatureStates() {
        return React.useSyncExternalStore(
          (fn) => {
            const stop = api.subscribe(fn);
            return () => {
              stop();
            };
          },
          () => api.revision(),
        );
      };

      return {
        api,
        start() {
          api.paintRoot();
          for (const feature of FEATURES) api.reconcile(feature);
          api.paint();

          ctx.effect(() => {
            // The client half activates before the shell renders, so the root
            // slot does not exist on this first call. Observing `document.body`
            // rather than the anchor is what makes the first real stamp happen;
            // observing a missing anchor would leave every feature unstyled for
            // the life of the page.
            stampShell();
            let queued = false;
            const observer = new MutationObserver(() => {
              if (queued) return;
              queued = true;
              requestAnimationFrame(() => {
                queued = false;
                stampShell();
              });
            });
            observer.observe(document.body, { childList: true, subtree: true });
            return () => {
              observer.disconnect();
              unstampShell();
            };
          });

          ctx.effect(() => {
            return () => {
              for (const dispose of cleanups.values()) dispose();
              cleanups.clear();
              const tag = document.getElementById(STYLE_ID);
              if (tag) tag.remove();
              document.documentElement.removeAttribute(ROOT_ATTR);
              unstampShell();
            };
          });
        },
        /** Keep the document attribute in step after a toggle. */
        setRootAttr(on) {
          const root = document.documentElement;
          if (on) root.setAttribute(ROOT_ATTR, '');
          else root.removeAttribute(ROOT_ATTR);
        },
      };
    }
