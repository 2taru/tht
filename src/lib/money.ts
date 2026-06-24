/** Форматує суму у валюті (десяткові, локаль uk). */
export function formatMoney(
  amount: number,
  currency: string,
  locale = "uk",
): string {
  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    // невідомий код валюти — показуємо число + код
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(amount)} ${currency}`;
  }
}

/** Сума до оплати: години × ставка (null ставка → 0). */
export function billableAmount(
  minutes: number,
  hourlyRate: number | null,
): number {
  if (hourlyRate == null) return 0;
  return (minutes / 60) * hourlyRate;
}
