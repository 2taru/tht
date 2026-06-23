/** Екранує значення для CSV (лапки, коми, переноси). */
function escapeCell(value: string | number): string {
  const s = String(value);
  if (/[",\n;]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Будує CSV-рядок із заголовків і рядків. */
export function toCsv(
  headers: string[],
  rows: (string | number)[][],
): string {
  const lines = [headers, ...rows].map((row) => row.map(escapeCell).join(","));
  return lines.join("\n");
}

/** Завантажує текстовий вміст як файл (Blob). \uFEFF — BOM для Excel/кирилиці. */
export function downloadCsv(filename: string, content: string): void {
  const blob = new Blob(["\uFEFF" + content], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
