# `A11yConfig` and `audit()`

This is the canonical list of which `A11yConfig` fields the engine actually
reads today, plus what `audit()` checks. Treat this doc as the source of
truth over the type definitions alone — several fields are accepted for a
future, larger rule set but not yet wired up.

## `A11yConfig`

```ts
interface A11yConfig {
  wcagLevel: WCAGLevel;
  focusManagement: boolean;
  ariaAutomation?: AriaAutomation;
  contrastMinimumRatio?: number;
  testMode?: boolean;
}
```

| Field | Required | Read by `createAccessibilityEngine` today |
|---|---|---|
| `wcagLevel` | yes | **No.** Stored on the closed-over `config` object but never branched on — `audit()` runs the same single check regardless of `A`/`AA`/`AAA`. |
| `focusManagement` | yes | **Yes** — `audit()` only runs its "missing-focus" check when this is `true`. |
| `ariaAutomation` | no | **No.** None of `autoLabel`/`autoRole`/`autoDescribe`/`autoLive`/`liveRegionPriority` currently drive any behavior. `announceToScreenReader` takes `priority` as an explicit argument instead of reading `ariaAutomation.liveRegionPriority`. |
| `contrastMinimumRatio` | no (default `4.5`) | **Yes** — used by `validateContrast`. See [contrast-validation.md](contrast-validation.md). |
| `testMode` | no | **No.** Accepted on the type, not read anywhere in `createAccessibilityEngine`. |

Practical upshot: today, only `focusManagement` and `contrastMinimumRatio`
change engine behavior. `wcagLevel` is required by the type (so you must
still pass a value), but changing it currently has no runtime effect —
don't rely on it to gate stricter checks yet.

## `WCAGLevel`

```ts
enum WCAGLevel { A = "A", AA = "AA", AAA = "AAA" }
```

A plain string enum with no associated behavior in this package's current
implementation. It exists as a forward-compatible config surface for a
future rule set that varies by conformance level (e.g. contrast thresholds
tightening from `AA`'s `4.5:1` to `AAA`'s `7:1`) — see the note in
[contrast-validation.md](contrast-validation.md#threshold-contrastminimumratio)
about the flat threshold today.

## `audit(): A11yAuditResult`

```ts
audit(): A11yAuditResult {
  const violations: A11yAuditResult["violations"] = [];
  if (config.focusManagement && !focusManager.getFocusedElement()) {
    violations.push({
      id: "missing-focus",
      impact: "moderate",
      message: "No active focus target found.",
      nodes: [],
    });
  }
  return { violations, passes: Math.max(0, 1 - violations.length), timestamp: Date.now() };
}
```

### The one built-in check

`missing-focus` fires when **both**:

1. `config.focusManagement` is `true`, and
2. `focusManager.getFocusedElement()` returns `null` (i.e.
   `document.activeElement` is falsy, or `document` itself is undefined).

The violation's `nodes` array is always empty — `audit()` does not
currently identify *which* element should have been focused, only that
nothing is.

### `passes` is a 0/1 flag, not a count

`Math.max(0, 1 - violations.length)` means `passes` is `1` when
`violations` is empty and `0` whenever there is at least one violation — it
does not increase with more distinct checks passing, and it does not go
negative with more than one violation. Don't read `passes` as "number of
checks that passed"; today it only ever means "the single built-in check
passed (`1`) or didn't (`0`)".

### What `audit()` is not

It is not a WCAG 2.2 conformance scanner. There is no DOM traversal for
missing `alt` text, invalid ARIA usage, heading-order problems, color
contrast across the page, or anything keyed by `wcagLevel`. If you need
broader static auditing, `audit()` is a hook point to extend (or to pair
with an existing tool like axe-core), not a replacement for one.

## Example: extending `audit()` yourself

Since `audit()` is intentionally minimal, a common pattern is to compose it
with `validateContrast` over the elements you care about:

```ts
function fullAudit(a11y: A11yEngine, root: HTMLElement) {
  const result = a11y.audit();

  root.querySelectorAll<HTMLElement>("[data-obix-contrast-ratio]").forEach((el) => {
    if (!a11y.validateContrast(el)) {
      result.violations.push({
        id: "low-contrast",
        impact: "serious",
        message: `Contrast ratio below minimum on ${el.tagName.toLowerCase()}`,
        nodes: [el],
      });
    }
  });

  return result;
}
```
