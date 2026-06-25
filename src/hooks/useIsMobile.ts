import { useEffect, useState } from "react";

/** Tailwind `md` — нижче цього вважаємо мобільним (діалоги → drawer). */
const MOBILE_BREAKPOINT = 768;

/**
 * Чи поточна ширина екрана мобільна (< md). Слухає зміну розміру через
 * matchMedia. Початкове значення читається синхронно, щоб уникнути миготіння.
 */
export function useIsMobile(): boolean {
  const query = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`;
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.matchMedia(query).matches,
  );

  useEffect(() => {
    const mql = window.matchMedia(query);
    const onChange = () => setIsMobile(mql.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [query]);

  return isMobile;
}
