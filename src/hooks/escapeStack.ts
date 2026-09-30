/**
 * The Escape-key layer stack.
 *
 * Overlays nest: a modal sits inside the admin panel, which sits over the page.
 * One Escape press must close exactly one layer — the topmost.
 *
 * `stopPropagation()` cannot express that. Every layer registers its listener on
 * `document`, and stopping propagation prevents the event reaching *other nodes*,
 * not other listeners on the *same* node. The previous implementation therefore
 * closed a modal and the panel behind it in a single press.
 *
 * Each open layer pushes its handler here; only the top of the stack responds.
 * This lives apart from the hook so the ordering rule can be reasoned about —
 * and tested — without a DOM.
 */

type EscapeHandler = () => void;

const stack: EscapeHandler[] = [];

export function pushEscapeLayer(handler: EscapeHandler): () => void {
  stack.push(handler);
  return () => {
    const index = stack.indexOf(handler);
    // -1 means the layer already unmounted; removing the wrong entry would
    // strand an unrelated layer and make Escape silently do nothing.
    if (index !== -1) stack.splice(index, 1);
  };
}

export function escapeLayerCount(): number {
  return stack.length;
}

/** Invokes the topmost layer. Returns true if a layer handled it. */
export function dispatchEscape(): boolean {
  const top = stack[stack.length - 1];
  if (!top) return false;
  top();
  return true;
}
