/**
 * OBIX Accessibility - WCAG 2.2 enforcement, focus management, ARIA automation
 * Comprehensive accessibility engine for inclusive UI/UX
 */
export var WCAGLevel;
(function (WCAGLevel) {
    WCAGLevel["A"] = "A";
    WCAGLevel["AA"] = "AA";
    WCAGLevel["AAA"] = "AAA";
})(WCAGLevel || (WCAGLevel = {}));
const focusableSelector = "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])";
export function createAccessibilityEngine(config) {
    let savedFocus = null;
    let trapEnabled = false;
    let trapContainer;
    const contrastHooks = [];
    const keydownHandler = (event) => {
        if (!trapEnabled || !trapContainer || event.key !== "Tab") {
            return;
        }
        const focusables = Array.from(trapContainer.querySelectorAll(focusableSelector)).filter((element) => !element.hasAttribute("disabled"));
        if (focusables.length === 0) {
            event.preventDefault();
            return;
        }
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        const active = document.activeElement;
        if (!event.shiftKey && active === last) {
            event.preventDefault();
            first.focus();
        }
        if (event.shiftKey && active === first) {
            event.preventDefault();
            last.focus();
        }
    };
    const focusManager = {
        setFocus(element) {
            element.focus();
        },
        getFocusedElement() {
            return (typeof document !== "undefined" ? document.activeElement : null) ?? null;
        },
        saveFocusState() {
            savedFocus = this.getFocusedElement();
        },
        restoreFocusState() {
            savedFocus?.focus();
        },
        manageFocusTrap(enabled, container) {
            if (typeof document === "undefined") {
                return;
            }
            trapEnabled = enabled;
            trapContainer = container;
            document.removeEventListener("keydown", keydownHandler);
            if (enabled && container) {
                document.addEventListener("keydown", keydownHandler);
                const first = container.querySelector(focusableSelector);
                first?.focus();
            }
        }
    };
    return {
        audit() {
            const violations = [];
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
        enforceFocus(trap, container) {
            focusManager.manageFocusTrap(trap, container);
        },
        announceToScreenReader(message, priority) {
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
        validateContrast(element) {
            const ratio = Number(element.dataset.obixContrastRatio ?? "0");
            contrastHooks.forEach((hook) => hook(element, ratio));
            return ratio >= (config.contrastMinimumRatio ?? 4.5);
        },
        registerContrastAuditHook(hook) {
            contrastHooks.push(hook);
        },
        getFocusManager() {
            return focusManager;
        }
    };
}
//# sourceMappingURL=index.js.map