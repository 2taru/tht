/**
 * Спільні пресети анімацій (motion). Тримаємо рухи узгодженими по всьому
 * застосунку: входи контенту — швидкий tween із «expo-out» (різкий старт,
 * м'яке доведення), інтерактив — spring. Лише transform/opacity — без
 * анімації layout-властивостей, щоб не викликати перерахунок макета.
 */

/** Cubic-bezier «expo-out» — знімає відчуття лагу на входах контенту. */
export const EASE_OUT: [number, number, number, number] = [0.16, 1, 0.3, 1];

/** Вхід сторінки/вкладки: легкий підйом + fade. */
export const contentEnter = {
  initial: { opacity: 0, y: 6 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.18, ease: EASE_OUT },
} as const;

/**
 * Перехід між сторінками (обгортка `Outlet` в AppShell) — ЛИШЕ opacity, без `y`.
 * Анімація `y` лишає `transform` на елементі, а трансформований предок ламає
 * `position: sticky` всередині (липкі заголовки сторінок «протікали» б фоном).
 */
export const pageFade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.18, ease: EASE_OUT },
} as const;

/** Поступова поява рядків списку; затримка обмежена, щоб хвіст не тягнувся. */
export function listItem(index: number) {
  return {
    initial: { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: {
      duration: 0.15,
      ease: EASE_OUT,
      delay: Math.min(index * 0.03, 0.15),
    },
  } as const;
}

/** Пружний «поп» для інтерактивних елементів (FAB, бейджі). */
export const POP_SPRING = {
  type: "spring",
  stiffness: 500,
  damping: 28,
} as const;
