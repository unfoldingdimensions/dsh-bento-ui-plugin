/**
 * Host half of the bento theme bundle.
 *
 * All rendering and styling lives in the browser half (`client.js`). This module
 * exists so the bundle row activates and the client module roster can discover
 * the browser artifact, and it is deliberately minimal: a host half that does
 * real work during activation turns any mistake into a whole-application boot
 * failure.
 *
 * The default-export form is what every working third-party theme on this
 * machine uses (`dsh-skin`, `dsh-claude-style`, `dsh-cost-meter`), so this
 * bundle keeps that shape rather than the named-export form.
 */
export default {
  apply() {},
}
