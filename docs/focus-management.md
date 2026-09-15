# Focus management

`getFocusManager()` returns the engine's single `FocusManager`, which owns
three related pieces of state: the currently trapped container, a listener
on `document` for `Tab` handling, and one saved-focus slot.

```ts
interface FocusManager {
  setFocus(element: HTMLElement): void;
  getFocusedElement(): HTMLElement | null;
  saveFocusState(): void;
  restoreFocusState(): void;
  manageFocusTrap(enabled: boolean, container?: HTMLElement): void;
}
```

## `setFocus(element)` / `getFocusedElement()`

`setFocus` calls `element.focus()` directly — no guard, since it only
touches the element it's given, not the global `document`.

`getFocusedElement` returns `document.activeElement as HTMLElement | null`,
or `null` when `document` is undefined (SSR-safe).

## `saveFocusState()` / `restoreFocusState()`

```ts
saveFocusState(): void {
  savedFocus = this.getFocusedElement();
},
restoreFocusState(): void {
  savedFocus?.focus();
},
```

A single closure variable, not a stack. Calling `saveFocusState()` twice
before a matching `restoreFocusState()` overwrites the first saved element —
if you nest two focus-trapping flows (e.g. a modal that opens another
modal), save/restore each one around its own trap rather than assuming
save/restore composes automatically.

Typical pairing with a trap:

```ts
focusManager.saveFocusState();     // remember what was focused before the modal
focusManager.manageFocusTrap(true, modalEl);
// ...user interacts with the modal...
focusManager.manageFocusTrap(false);
focusManager.restoreFocusState();  // focus goes back to the pre-modal element
```

Note that `manageFocusTrap(false)` does **not** call `restoreFocusState()`
for you — disabling the trap and restoring prior focus are independent
calls you make together.

## `manageFocusTrap(enabled, container?)`

```ts
manageFocusTrap(enabled, container) {
  if (typeof document === "undefined") return;

  trapEnabled = enabled;
  trapContainer = container;

  document.removeEventListener("keydown", keydownHandler);
  if (enabled && container) {
    document.addEventListener("keydown", keydownHandler);
    const first = container.querySelector<HTMLElement>(focusableSelector);
    first?.focus();
  }
}
```

- No-ops entirely when `document` is undefined (SSR).
- Always removes the previous `keydown` listener first, so repeated calls
  never stack duplicate listeners — calling `manageFocusTrap(true, a)` then
  `manageFocusTrap(true, b)` cleanly moves the trap from `a` to `b`.
- Enabling with a `container` immediately focuses the first element in that
  container matching `focusableSelector` (elements with a `disabled`
  attribute are excluded by the keydown handler, but this initial
  auto-focus does **not** filter out disabled elements itself — it just
  takes `container.querySelector(focusableSelector)`'s first match).
- Calling with `enabled: false` clears the listener and leaves
  `trapContainer` cleared; it does not move focus anywhere.

### The Tab-wrapping algorithm

```ts
const keydownHandler = (event: KeyboardEvent): void => {
  if (!trapEnabled || !trapContainer || event.key !== "Tab") return;

  const focusables = Array.from(trapContainer.querySelectorAll<HTMLElement>(focusableSelector))
    .filter((element) => !element.hasAttribute("disabled"));

  if (focusables.length === 0) {
    event.preventDefault();
    return;
  }

  const first = focusables[0];
  const last = focusables[focusables.length - 1];
  const active = document.activeElement as HTMLElement | null;

  if (!event.shiftKey && active === last) {
    event.preventDefault();
    first.focus();
  }
  if (event.shiftKey && active === first) {
    event.preventDefault();
    last.focus();
  }
};
```

- Only fires on `Tab` keydown, and only while a trap is active.
- Re-queries `trapContainer.querySelectorAll(focusableSelector)` on every
  keystroke (not cached), so it stays correct if the container's contents
  change while the trap is active — but it is a live DOM query per Tab
  press, not free.
- **Boundary wrapping only**: it intervenes exactly when the currently
  active element is the *last* focusable one and `Tab` (no shift) is
  pressed (wraps to `first`), or the active element is the *first* one and
  `Shift+Tab` is pressed (wraps to `last`). Tabbing anywhere in the middle
  of the container is left to native browser behavior. It does **not**
  intercept mouse clicks or a programmatic `.focus()` call that lands
  outside `container` — this is a boundary-wrap trap, not a full focus
  containment guard.
- If `container` currently has zero focusable elements (or all of them are
  `disabled`), every `Tab` press is simply prevented — focus cannot leave
  (or enter) the container via keyboard at all until something focusable
  appears.

## Testing it

Because `manageFocusTrap` and the keydown handler both touch the global
`document`, tests stub `document` directly and capture whatever handler was
registered via `addEventListener`:

```ts
const listeners: Record<string, (e: KeyboardEvent) => void> = {};
vi.stubGlobal("document", {
  activeElement: last,
  addEventListener: (type, handler) => { listeners[type] = handler; },
  removeEventListener: vi.fn(),
  // ...
});

engine.enforceFocus(true, container);
listeners.keydown?.({ key: "Tab", shiftKey: false, preventDefault: vi.fn() } as unknown as KeyboardEvent);
```

See [`__tests__/integration.test.ts`](../__tests__/integration.test.ts) for
the full setup, including the `container.querySelectorAll`/`querySelector`
stubs the trap depends on.
