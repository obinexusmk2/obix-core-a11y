# API reference

Full type and method surface of `@obinexusltd/obix-core-a11y`. Everything is
exported from the package root (`src/index.ts`); there is no subpath export.

## `createAccessibilityEngine(config: A11yConfig): A11yEngine`

The only factory. Each call returns an independent engine with its own
closed-over focus state (`savedFocus`, `trapEnabled`, `trapContainer`) and
contrast-hook list.

```ts
interface A11yConfig {
  wcagLevel: WCAGLevel;
  focusManagement: boolean;
  ariaAutomation?: AriaAutomation;
  contrastMinimumRatio?: number;
  testMode?: boolean;
}
```

| Field | Read by |
|---|---|
| `wcagLevel` | Nothing currently — accepted and stored on `config`, not branched on. |
| `focusManagement` | `audit()` — gates the "missing-focus" check. |
| `ariaAutomation` | Nothing currently. |
| `contrastMinimumRatio` | `validateContrast(element)` — compared against the element's ratio; defaults to `4.5` when unset. |
| `testMode` | Nothing currently. |

See [audit-and-config.md](audit-and-config.md) for the full breakdown of
which fields are load-bearing today.

## `A11yEngine`

```ts
interface A11yEngine {
  audit(): A11yAuditResult;
  enforceFocus(trap: boolean, container?: HTMLElement): void;
  announceToScreenReader(message: string, priority: "polite" | "assertive"): void;
  validateContrast(element: HTMLElement): boolean;
  registerContrastAuditHook(hook: (element: HTMLElement, ratio: number) => void): void;
  getFocusManager(): FocusManager;
}
```

### `audit(): A11yAuditResult`

Runs the engine's built-in checks (currently: focus presence, gated by
`config.focusManagement`) and returns:

```ts
interface A11yAuditResult {
  violations: Array<{
    id: string;
    impact: "minor" | "moderate" | "serious" | "critical";
    message: string;
    nodes: HTMLElement[];
  }>;
  passes: number;
  timestamp: number; // Date.now()
}
```

See [audit-and-config.md](audit-and-config.md) for the exact check and its
`passes` scoring.

### `enforceFocus(trap, container?)`

Thin wrapper over `getFocusManager().manageFocusTrap(trap, container)`. See
[focus-management.md](focus-management.md).

### `announceToScreenReader(message, priority)`

Creates a visually-hidden `div[role="status"][aria-live="{priority}"]`,
appends it to `document.body`, and removes it on the next tick. No-ops when
`document` is undefined (SSR). See
[screen-reader-announcements.md](screen-reader-announcements.md).

### `validateContrast(element)`

Reads `element.dataset.obixContrastRatio`, calls every registered contrast
hook with `(element, ratio)`, and returns whether that ratio meets
`config.contrastMinimumRatio ?? 4.5`. See
[contrast-validation.md](contrast-validation.md).

### `registerContrastAuditHook(hook)`

Appends to an internal array; every hook runs (in registration order) on
every `validateContrast` call, purely as a side channel — hooks cannot
change the boolean result.

### `getFocusManager(): FocusManager`

Returns the engine's single internal `FocusManager` instance (not a new
one per call).

## `FocusManager`

```ts
interface FocusManager {
  setFocus(element: HTMLElement): void;
  getFocusedElement(): HTMLElement | null;
  saveFocusState(): void;
  restoreFocusState(): void;
  manageFocusTrap(enabled: boolean, container?: HTMLElement): void;
}
```

See [focus-management.md](focus-management.md) for behavior and the
Tab-wrapping algorithm inside `manageFocusTrap`.

## Supporting types

```ts
enum WCAGLevel { A = "A", AA = "AA", AAA = "AAA" } // accepted, not yet enforced

interface AriaAutomation {
  autoLabel: boolean;
  autoRole: boolean;
  autoDescribe: boolean;
  autoLive: boolean;
  liveRegionPriority: "polite" | "assertive";
} // typed, not yet consumed by createAccessibilityEngine
```

## Internal constant

```ts
const focusableSelector =
  "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])";
```

Not exported — used internally by `manageFocusTrap` to find the first/last
focusable elements in a trap container. Elements matching this selector are
further filtered to exclude anything with a `disabled` attribute.
