# Screen-reader announcements

`announceToScreenReader(message, priority)` is the engine's only mechanism
for pushing content to assistive technology outside of whatever is already
in the accessibility tree.

```ts
announceToScreenReader(message: string, priority: "polite" | "assertive"): void {
  if (typeof document === "undefined") return;

  const liveRegion = document.createElement("div");
  liveRegion.setAttribute("aria-live", priority);
  liveRegion.setAttribute("role", "status");
  liveRegion.style.position = "absolute";
  liveRegion.style.left = "-9999px";
  liveRegion.textContent = message;
  document.body.appendChild(liveRegion);
  setTimeout(() => liveRegion.remove(), 0);
}
```

## What it does, step by step

1. No-ops if `document` is undefined (SSR-safe).
2. Creates a `<div>`, sets `aria-live="{priority}"` and `role="status"` on
   it, and visually hides it by absolutely positioning it off-screen
   (`left: -9999px`) rather than `display: none` — screen readers ignore
   `display: none` content, so this keeps the node in the accessibility
   tree while it's invisible on screen.
3. Sets `textContent` to `message`.
4. Appends it to `document.body`.
5. Removes it on the next macrotask (`setTimeout(..., 0)`).

## Why the element is removed immediately

Most screen readers announce the *change* to a live region's content, not
its mere presence. Appending a populated live region (rather than
appending an empty one and updating it afterward) is what reliably triggers
the announcement in this pattern; removing it right after on the next tick
avoids leaking one `<div>` into the DOM per announcement while still
giving the accessibility tree time to pick up the mutation. There is no
batching — each call creates and tears down its own element.

## `priority`: `"polite"` vs `"assertive"`

Passed straight through to `aria-live`:

- `"polite"` — most screen readers wait for the current speech to finish
  before announcing this message. Use for non-urgent status updates (a
  form saved, a list finished loading).
- `"assertive"` — most screen readers interrupt current speech to announce
  immediately. Reserve for urgent, time-sensitive information (an error
  that blocks progress); overuse is disorienting.

`priority` is a required, explicit argument on every call — it is **not**
derived from `A11yConfig.ariaAutomation.liveRegionPriority`. That config
field exists on the `AriaAutomation` type but is not currently read by
`createAccessibilityEngine`; if you want a default priority per app, wrap
`announceToScreenReader` at your call site rather than relying on config.

## Example

```ts
a11y.announceToScreenReader("3 items added to cart", "polite");

// Later, on a blocking validation failure:
a11y.announceToScreenReader("Form could not be submitted: email is required", "assertive");
```

## Testing it

Tests stub `document.createElement` and `document.body.appendChild` since
the real DOM isn't available in the unit-test environment:

```ts
const documentStub = {
  createElement: () => ({ setAttribute: vi.fn(), style: {}, textContent: "", remove: vi.fn() }),
  body: { appendChild: vi.fn() },
  // ...
};
vi.stubGlobal("document", documentStub);
```
