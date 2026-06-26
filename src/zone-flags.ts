/**
 * Prevents Angular change detection from
 * running with certain Web Component callbacks
 */
interface ZonePatchedWindow extends Window {
  __Zone_disable_customElements?: boolean;
}

(window as ZonePatchedWindow).__Zone_disable_customElements = true;
