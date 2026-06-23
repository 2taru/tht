import * as XLSX from "xlsx";

export interface ParsedRow {
  date: string; // YYYY-MM-DD
  projectName: string;
  startMinute: number;
  endMinute: number;
  description: string | null;
}

export interface ParseResult {
  rows: ParsedRow[];
  invalid: number;
}

// Аліаси заголовків (укр/англ) → канонічне поле.
const HEADER_ALIASES: Record<string, keyof RawFields> = {
  date: "date",
  дата: "date",
  project: "project",
  проєкт: "project",
  проект: "project",
  start: "start",
  початок: "start",
  від: "start",
  end: "end",
  кінець: "end",
  до: "end",
  description: "description",
  опис: "description",
};

interface RawFields {
  date?: string;
  project?: string;
  start?: string;
  end?: string;
  description?: string;
}

function normalizeRow(raw: Record<string, unknown>): RawFields {
  const out: RawFields = {};
  for (const [key, value] of Object.entries(raw)) {
    const field = HEADER_ALIASES[key.trim().toLowerCase()];
    if (field) out[field] = value == null ? "" : String(value).trim();
  }
  return out;
}

/** "2026-06-23" | "23.06.2026" | "23/06/2026" → ISO або null. */
function parseDate(value: string | undefined): string | null {
  if (!value) return null;
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) return value;
  const dmy = value.match(/^(\d{1,2})[./](\d{1,2})[./](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  return null;
}

/** "9:00" | "09:30" | "9:00:00" | "9:00 AM" → хвилини від півночі, або null. */
function parseMinute(value: string | undefined): number | null {
  if (!value) return null;
  const m = value.match(/^(\d{1,2}):(\d{2})/);
  if (!m) return null;
  const minute = Number(m[1]) * 60 + Number(m[2]);
  if (minute < 0 || minute > 1440) return null;
  return minute;
}

/** Простий CSV-парсер із підтримкою лапок (інверсія нашого експорту). */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else inQuotes = false;
      } else field += c;
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ",") {
      row.push(field);
      field = "";
    } else if (c === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else if (c !== "\r") {
      field += c;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

/** Файл → масив рядків-обʼєктів {заголовок: значення}. */
async function readRecords(file: File): Promise<Record<string, string>[]> {
  const isCsv =
    file.name.toLowerCase().endsWith(".csv") || file.type === "text/csv";
  if (isCsv) {
    const text = await file.text();
    const table = parseCsv(text).filter((r) => r.some((c) => c.trim() !== ""));
    if (table.length === 0) return [];
    const headers = table[0];
    return table.slice(1).map((cells) => {
      const obj: Record<string, string> = {};
      headers.forEach((h, i) => (obj[h] = cells[i] ?? ""));
      return obj;
    });
  }
  const buf = await file.arrayBuffer();
  const wb = XLSX.read(buf, { type: "array" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, string>>(sheet, {
    raw: false,
    defval: "",
  });
}

/** Парсить CSV/XLSX-файл у записи часу. Невалідні рядки рахуються в `invalid`. */
export async function parseEntriesFile(file: File): Promise<ParseResult> {
  const raw = await readRecords(file);

  const rows: ParsedRow[] = [];
  let invalid = 0;

  for (const r of raw) {
    const f = normalizeRow(r);
    const date = parseDate(f.date);
    const start = parseMinute(f.start);
    const end = parseMinute(f.end);
    const project = f.project?.trim();
    if (!date || !project || start === null || end === null || end <= start) {
      invalid++;
      continue;
    }
    rows.push({
      date,
      projectName: project,
      startMinute: start,
      endMinute: end,
      description: f.description?.trim() || null,
    });
  }

  return { rows, invalid };
}
