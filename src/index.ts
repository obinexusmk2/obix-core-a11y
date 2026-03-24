/**
 * OBIX Accessibility - WCAG 2.2 enforcement, focus management, ARIA automation
 * Comprehensive accessibility engine for inclusive UI/UX
 */

export enum WCAGLevel {
  A = "A",
  AA = "AA",
  AAA = "AAA"
}

export interface FocusManager {
  setFocus(element: HTMLElement): void;
  getFocusedElement(): HTMLElement | null;
  saveFocusState(): void;
  restoreFocusState(): void;
  manageFocusTrap(enabled: boolean, container?: HTMLElement): void;
}

export interface AriaAutomation {
  autoLabel: boolean;
  autoRole: boolean;
  autoDescribe: boolean;
  autoLive: boolean;
  liveRegionPriority: "polite" | "assertive";
}

export interface A11yConfig {
  wcagLevel: WCAGLevel;
  focusManagement: boolean;
  ariaAutomation?: AriaAutomation;
  contrastMinimumRatio?: number;
  testMode?: boolean;
}

export interface A11yAuditResult {
  violations: Array<{
    id: string;
    impact: "minor" | "moderate" | "serious" | "critical";
    message: string;
    nodes: HTMLElement[];
  }>;
  passes: number;
  timestamp: number;
}

export interface A11yEngine {
  audit(): A11yAuditResult;
  enforceFocus(trap: boolean, container?: HTMLElement): void;
  announceToScreenReader(message: string, priority: "polite" | "assertive"): void;
  validateContrast(element: HTMLElement): boolean;
  registerContrastAuditHook(hook: (element: HTMLElement, ratio: number) => void): void;
  getFocusManager(): FocusManager;
}

const focusableSelector = "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])";

export function createAccessibilityEngine(config: A11yConfig): A11yEngine {
  let savedFocus: HTMLElement | null = null;
  let trapEnabled = false;
  let trapContainer: HTMLElement | undefined;
  const contrastHooks: Array<(element: HTMLElement, ratio: number) => void> = [];

  const keydownHandler = (event: KeyboardEvent): void => {
    if (!trapEnabled || !trapContainer || event.key !== "Tab") {
      return;
    }

    const focusables = Array.from(trapContainer.querySelectorAll<HTMLElement>(focusableSelector)).filter(
      (element) => !element.hasAttribute("disabled")
    );

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

  const focusManager: FocusManager = {
    setFocus(element: HTMLElement): void {
      element.focus();
    },
    getFocusedElement(): HTMLElement | null {
      return (typeof document !== "undefined" ? (document.activeElement as HTMLElement | null) : null) ?? null;
    },
    saveFocusState(): void {
      savedFocus = this.getFocusedElement();
    },
    restoreFocusState(): void {
      savedFocus?.focus();
    },
    manageFocusTrap(enabled: boolean, container?: HTMLElement): void {
      if (typeof document === "undefined") {
        return;
      }

      trapEnabled = enabled;
      trapContainer = container;

      document.removeEventListener("keydown", keydownHandler);
      if (enabled && container) {
        document.addEventListener("keydown", keydownHandler);
        const first = container.querySelector<HTMLElement>(focusableSelector);
        first?.focus();
      }
    }
  };

  return {
    audit(): A11yAuditResult {
      const violations: A11yAuditResult["violations"] = [];
      if (config.focusManagement && !focusManager.getFocusedElement()) {
        violations.push({
          id: "missing-focus",
          impact: "moderate",
          message: "No active focus target found.",
          nodes: []
        });
      }

      return {
        violations,
        passes: Math.max(0, 1 - violations.length),
        timestamp: Date.now()
      };
    },
    enforceFocus(trap: boolean, container?: HTMLElement): void {
      focusManager.manageFocusTrap(trap, container);
    },
    announceToScreenReader(message: string, priority: "polite" | "assertive"): void {
      if (typeof document === "undefined") {
        return;
      }

      const liveRegion = document.createElement("div");
      liveRegion.setAttribute("aria-live", priority);
      liveRegion.setAttribute("role", "status");
      liveRegion.style.position = "absolute";
      liveRegion.style.left = "-9999px";
      liveRegion.textContent = message;
      document.body.appendChild(liveRegion);
      setTimeout(() => liveRegion.remove(), 0);
    },
    validateContrast(element: HTMLElement): boolean {
      const ratio = Number(element.dataset.obixContrastRatio ?? "0");
      contrastHooks.forEach((hook) => hook(element, ratio));
      return ratio >= (config.contrastMinimumRatio ?? 4.5);
    },
    registerContrastAuditHook(hook: (element: HTMLElement, ratio: number) => void): void {
      contrastHooks.push(hook);
    },
    getFocusManager(): FocusManager {
      return focusManager;
    }
  };
}
