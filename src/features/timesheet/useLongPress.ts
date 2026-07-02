import { useEffect, useRef } from "react";
import { LONG_PRESS_MS, TOUCH_SLOP_PX } from "./geometry";

/**
 * Long-press для touch: свайп лишається браузерним скролом, утримання починає
 * drag-взаємодію. touch-action не можна змінити посеред жесту, тому скрол під
 * час активної взаємодії блокуємо непасивним touchmove-слухачем (React вішає
 * touchmove пасивно). Спільне для DayColumn (виділення) і EntryBlock (перенесення).
 */
export function useLongPress<T extends HTMLElement>(
  ref: React.RefObject<T | null>,
) {
  /** true, поки триває touch-ініційована взаємодія — блокує скрол. */
  const activeRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const startRef = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onTouchMove = (ev: TouchEvent) => {
      if (activeRef.current) ev.preventDefault();
    };
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    return () => el.removeEventListener("touchmove", onTouchMove);
  }, [ref]);

  function cancel() {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }

  /** Почати очікування long-press (pointerdown із pointerType === "touch"). */
  function begin(e: React.PointerEvent, onActivate: () => void) {
    startRef.current = { x: e.clientX, y: e.clientY };
    cancel();
    timerRef.current = window.setTimeout(() => {
      timerRef.current = null;
      activeRef.current = true;
      navigator.vibrate?.(10);
      onActivate();
    }, LONG_PRESS_MS);
  }

  /** true, якщо long-press ще очікується; рух > слоп скасовує його (це свайп). */
  function handleMoveWhileWaiting(e: React.PointerEvent): boolean {
    if (timerRef.current === null || !startRef.current) return false;
    const dx = e.clientX - startRef.current.x;
    const dy = e.clientY - startRef.current.y;
    if (Math.hypot(dx, dy) > TOUCH_SLOP_PX) cancel();
    return true;
  }

  /** Завершити очікування: точка тапа, якщо long-press не встиг спрацювати. */
  function endAsTap(): { x: number; y: number } | null {
    const wasWaiting = timerRef.current !== null;
    cancel();
    const start = startRef.current;
    startRef.current = null;
    return wasWaiting ? start : null;
  }

  /**
   * Позначити активну взаємодію вручну (ресайз/drag, що почались не з long-press,
   * напр. з pending-оверлея) або зняти позначку після завершення.
   */
  function setActive(value: boolean) {
    activeRef.current = value;
  }

  /** Повний скидання (pointercancel). */
  function reset() {
    cancel();
    startRef.current = null;
    activeRef.current = false;
  }

  return { begin, handleMoveWhileWaiting, endAsTap, setActive, reset };
}
