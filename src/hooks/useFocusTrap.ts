import { type RefObject, useEffect } from "react";

type UseFocusTrapOptions = {
  containerRef: RefObject<HTMLElement | null>;
  active: boolean;
  onEscape?: () => void;
  restoreFocus?: boolean;
};

const FOCUSABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "textarea:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

function getFocusableElements(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter((element) => {
    if (element.getAttribute("aria-hidden") === "true") return false;

    const style = window.getComputedStyle(element);
    if (style.display === "none" || style.visibility === "hidden") return false;

    return true;
  });
}

export function useFocusTrap(options: UseFocusTrapOptions): void {
  const { containerRef, active, onEscape, restoreFocus = true } = options;

  useEffect(() => {
    if (!active) return;

    const container = containerRef.current;
    if (!container) return;

    const previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const focusableElements = getFocusableElements(container);
    const initialFocus = focusableElements[0] ?? container;

    initialFocus.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onEscape?.();
        return;
      }

      if (event.key !== "Tab") return;

      const nextFocusableElements = getFocusableElements(container);

      if (nextFocusableElements.length === 0) {
        event.preventDefault();
        container.focus();
        return;
      }

      const firstElement = nextFocusableElements[0]!;
      const lastElement = nextFocusableElements[nextFocusableElements.length - 1]!;
      const activeElement = document.activeElement instanceof HTMLElement ? document.activeElement : null;

      if (event.shiftKey) {
        if (activeElement === firstElement || !activeElement || !container.contains(activeElement)) {
          event.preventDefault();
          lastElement.focus();
        }
        return;
      }

      if (activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    };

    container.addEventListener("keydown", handleKeyDown);

    return () => {
      container.removeEventListener("keydown", handleKeyDown);
      if (!restoreFocus) return;
      previousFocus?.focus();
    };
  }, [active, containerRef, onEscape, restoreFocus]);
}
