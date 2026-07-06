/**
 * Мінімальний генератор .xlsx БЕЗ зовнішніх залежностей.
 *
 * Чому власний, а не бібліотека: SheetJS (`xlsx`) прибрано через HIGH-вразливості
 * (див. CLAUDE.md, `pnpm audit` має лишатися чистим). Тут — самодостатній OOXML:
 * пакет .xlsx = ZIP (метод STORE, без стиснення) з кількома XML-частинами.
 *
 * Підтримує: стилі (жирний заголовок із заливкою, тонкі межі, смугасті рядки,
 * формат чисел, ширини колонок, рядок «Разом») і один стовпчиковий графік на аркуш.
 *
 * Рядки пишемо як `inlineStr` — тому формула-ін'єкція неможлива (значення завжди
 * трактується як текст, а не формула), окремий sharedStrings не потрібен.
 */

export type Cell = string | number | null;

export interface Column {
  /** Ширина в «символах» Excel. */
  width: number;
}

export interface Chart {
  title?: string;
  /** 0-based колонка з підписами (категоріями). */
  categoryCol: number;
  /** 0-based колонка зі значеннями. */
  valueCol: number;
  /** 1-based рядок заголовка серії (зазвичай 1). */
  seriesNameRow: number;
  /** 1-based перший рядок даних. */
  dataFirstRow: number;
  /** 1-based останній рядок даних (включно). */
  dataLastRow: number;
  /** Прив'язка (0-based клітинки) лівого-верхнього та правого-нижнього кутів. */
  anchor: { fromCol: number; fromRow: number; toCol: number; toRow: number };
}

export interface Sheet {
  name: string;
  /** Перший рядок трактується як заголовок. */
  rows: Cell[][];
  columns?: Column[];
  /** Останній рядок оформлюється як підсумковий («Разом»). */
  totalRow?: boolean;
  chart?: Chart;
}

// ── Індекси стилів у STYLES_XML (cellXfs) ────────────────────────────────────
const S_HEADER = 1;
const S_TEXT = 2;
const S_NUM = 3;
const S_BAND_TEXT = 4;
const S_BAND_NUM = 5;
const S_TOTAL_TEXT = 6;
const S_TOTAL_NUM = 7;

// ── XML утиліти ──────────────────────────────────────────────────────────────

const enc = new TextEncoder();

function escapeXml(s: string): string {
  return s
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Літера(и) колонки за 0-based індексом: 0→A, 25→Z, 26→AA. */
function colName(i: number): string {
  let s = "";
  let n = i;
  do {
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return s;
}

/** Назва аркуша: ≤31 символ, без заборонених символів, не порожня. */
function sanitizeSheetName(name: string, index: number): string {
  const cleaned = name
    .replace(/[[\]:*?/\\]/g, " ")
    .trim()
    .slice(0, 31);
  return cleaned || `Sheet${index + 1}`;
}

/** Посилання на аркуш у формулі графіка: завжди в лапках (безпечно з кирилицею). */
function quoteSheet(name: string): string {
  return `'${name.replace(/'/g, "''")}'`;
}

function isNum(v: Cell): v is number {
  return typeof v === "number" && Number.isFinite(v);
}

function colsXml(columns?: Column[]): string {
  if (!columns || columns.length === 0) return "";
  const cols = columns
    .map(
      (c, i) =>
        `<col min="${i + 1}" max="${i + 1}" width="${c.width}" customWidth="1"/>`,
    )
    .join("");
  return `<cols>${cols}</cols>`;
}

function cellStyle(
  rowIndex: number,
  lastIndex: number,
  totalRow: boolean | undefined,
  numeric: boolean,
): number {
  if (rowIndex === 0) return S_HEADER;
  if (totalRow && rowIndex === lastIndex) return numeric ? S_TOTAL_NUM : S_TOTAL_TEXT;
  const banded = rowIndex % 2 === 0;
  if (numeric) return banded ? S_BAND_NUM : S_NUM;
  return banded ? S_BAND_TEXT : S_TEXT;
}

function sheetXml(sheet: Sheet): string {
  const { rows, columns, totalRow, chart } = sheet;
  const lastIndex = rows.length - 1;
  const parts: string[] = [
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>',
    '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">',
    colsXml(columns),
    "<sheetData>",
  ];
  rows.forEach((row, r) => {
    const rowNum = r + 1;
    parts.push(`<row r="${rowNum}">`);
    row.forEach((cell, c) => {
      const ref = `${colName(c)}${rowNum}`;
      const numeric = isNum(cell);
      const s = cellStyle(r, lastIndex, totalRow, numeric);
      if (numeric) {
        parts.push(`<c r="${ref}" s="${s}"><v>${cell}</v></c>`);
      } else if (cell == null || cell === "") {
        parts.push(`<c r="${ref}" s="${s}"/>`);
      } else {
        parts.push(
          `<c r="${ref}" s="${s}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(String(cell))}</t></is></c>`,
        );
      }
    });
    parts.push("</row>");
  });
  parts.push("</sheetData>");
  if (chart) parts.push('<drawing r:id="rId1"/>');
  parts.push("</worksheet>");
  return parts.join("");
}

// numFmtId=2 → "0.00" (вбудований). Кольори: заголовок — індиго, смуга — світла.
const STYLES_XML =
  '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
  '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">' +
  '<fonts count="3">' +
  '<font><sz val="11"/><name val="Calibri"/></font>' +
  '<font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font>' +
  '<font><b/><sz val="11"/><name val="Calibri"/></font>' +
  "</fonts>" +
  '<fills count="4">' +
  '<fill><patternFill patternType="none"/></fill>' +
  '<fill><patternFill patternType="gray125"/></fill>' +
  '<fill><patternFill patternType="solid"><fgColor rgb="FF4F46E5"/></patternFill></fill>' +
  '<fill><patternFill patternType="solid"><fgColor rgb="FFF3F4F6"/></patternFill></fill>' +
  "</fills>" +
  '<borders count="3">' +
  "<border><left/><right/><top/><bottom/><diagonal/></border>" +
  '<border><left style="thin"><color rgb="FFE5E7EB"/></left><right style="thin"><color rgb="FFE5E7EB"/></right><top style="thin"><color rgb="FFE5E7EB"/></top><bottom style="thin"><color rgb="FFE5E7EB"/></bottom><diagonal/></border>' +
  '<border><left style="thin"><color rgb="FFE5E7EB"/></left><right style="thin"><color rgb="FFE5E7EB"/></right><top style="medium"><color rgb="FF9CA3AF"/></top><bottom style="thin"><color rgb="FFE5E7EB"/></bottom><diagonal/></border>' +
  "</borders>" +
  '<cellStyleXfs count="1"><xf/></cellStyleXfs>' +
  '<cellXfs count="8">' +
  '<xf xfId="0"/>' +
  '<xf fontId="1" fillId="2" borderId="1" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center"/></xf>' +
  '<xf borderId="1" applyBorder="1"/>' +
  '<xf numFmtId="2" borderId="1" applyNumberFormat="1" applyBorder="1"/>' +
  '<xf fillId="3" borderId="1" applyFill="1" applyBorder="1"/>' +
  '<xf numFmtId="2" fillId="3" borderId="1" applyNumberFormat="1" applyFill="1" applyBorder="1"/>' +
  '<xf fontId="2" borderId="2" applyFont="1" applyBorder="1"/>' +
  '<xf numFmtId="2" fontId="2" borderId="2" applyNumberFormat="1" applyFont="1" applyBorder="1"/>' +
  "</cellXfs>" +
  '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>' +
  "</styleSheet>";

// ── Графік (barChart) ────────────────────────────────────────────────────────

const AX_CAT = 111111111;
const AX_VAL = 222222222;

function chartXml(sheet: Sheet): string {
  const chart = sheet.chart!;
  const sheetRef = quoteSheet(sanitizeSheetName(sheet.name, 0));
  const catL = colName(chart.categoryCol);
  const valL = colName(chart.valueCol);

  const cats: string[] = [];
  const vals: number[] = [];
  for (let r = chart.dataFirstRow; r <= chart.dataLastRow; r++) {
    const row = sheet.rows[r - 1] ?? [];
    cats.push(String(row[chart.categoryCol] ?? ""));
    const v = row[chart.valueCol];
    vals.push(isNum(v) ? v : 0);
  }
  const n = cats.length;
  const catPts = cats
    .map((v, i) => `<c:pt idx="${i}"><c:v>${escapeXml(v)}</c:v></c:pt>`)
    .join("");
  const valPts = vals
    .map((v, i) => `<c:pt idx="${i}"><c:v>${v}</c:v></c:pt>`)
    .join("");

  const seriesName = String(
    sheet.rows[chart.seriesNameRow - 1]?.[chart.valueCol] ?? "",
  );
  const titleXml = chart.title
    ? `<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>${escapeXml(chart.title)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title><c:autoTitleDeleted val="0"/>`
    : '<c:autoTitleDeleted val="1"/>';

  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">' +
    "<c:chart>" +
    titleXml +
    "<c:plotArea><c:layout/>" +
    '<c:barChart><c:barDir val="bar"/><c:grouping val="clustered"/><c:varyColors val="1"/>' +
    "<c:ser><c:idx val=\"0\"/><c:order val=\"0\"/>" +
    `<c:tx><c:strRef><c:f>${sheetRef}!$${valL}$${chart.seriesNameRow}</c:f><c:strCache><c:ptCount val="1"/><c:pt idx="0"><c:v>${escapeXml(seriesName)}</c:v></c:pt></c:strCache></c:strRef></c:tx>` +
    `<c:cat><c:strRef><c:f>${sheetRef}!$${catL}$${chart.dataFirstRow}:$${catL}$${chart.dataLastRow}</c:f><c:strCache><c:ptCount val="${n}"/>${catPts}</c:strCache></c:strRef></c:cat>` +
    `<c:val><c:numRef><c:f>${sheetRef}!$${valL}$${chart.dataFirstRow}:$${valL}$${chart.dataLastRow}</c:f><c:numCache><c:formatCode>0.00</c:formatCode><c:ptCount val="${n}"/>${valPts}</c:numCache></c:numRef></c:val>` +
    "</c:ser>" +
    `<c:axId val="${AX_CAT}"/><c:axId val="${AX_VAL}"/>` +
    "</c:barChart>" +
    `<c:catAx><c:axId val="${AX_CAT}"/><c:scaling><c:orientation val="maxMin"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:crossAx val="${AX_VAL}"/></c:catAx>` +
    `<c:valAx><c:axId val="${AX_VAL}"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:crossAx val="${AX_CAT}"/></c:valAx>` +
    "</c:plotArea><c:plotVisOnly val=\"1\"/>" +
    "</c:chart></c:chartSpace>"
  );
}

function drawingXml(chart: Chart): string {
  const a = chart.anchor;
  return (
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">' +
    '<xdr:twoCellAnchor editAs="oneCell">' +
    `<xdr:from><xdr:col>${a.fromCol}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${a.fromRow}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>` +
    `<xdr:to><xdr:col>${a.toCol}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${a.toRow}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>` +
    '<xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="Chart 1"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr>' +
    '<xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>' +
    '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">' +
    '<c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" r:id="rId1"/>' +
    "</a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/>" +
    "</xdr:twoCellAnchor></xdr:wsDr>"
  );
}

// ── ZIP (метод STORE, без стиснення) ─────────────────────────────────────────

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) {
    c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

interface ZipFile {
  name: string;
  data: Uint8Array;
}

function pushU16(out: number[], v: number): void {
  out.push(v & 0xff, (v >>> 8) & 0xff);
}
function pushU32(out: number[], v: number): void {
  out.push(v & 0xff, (v >>> 8) & 0xff, (v >>> 16) & 0xff, (v >>> 24) & 0xff);
}
function pushBytes(out: number[], bytes: Uint8Array): void {
  for (let i = 0; i < bytes.length; i++) out.push(bytes[i]);
}

/** Збирає ZIP-архів (STORE) з переданих файлів. */
function zipStore(files: ZipFile[]): Uint8Array {
  const out: number[] = [];
  const central: number[] = [];
  const offsets: number[] = [];

  for (const f of files) {
    const nameBytes = enc.encode(f.name);
    const crc = crc32(f.data);
    offsets.push(out.length);

    pushU32(out, 0x04034b50);
    pushU16(out, 20);
    pushU16(out, 0);
    pushU16(out, 0);
    pushU16(out, 0);
    pushU16(out, 0);
    pushU32(out, crc);
    pushU32(out, f.data.length);
    pushU32(out, f.data.length);
    pushU16(out, nameBytes.length);
    pushU16(out, 0);
    pushBytes(out, nameBytes);
    pushBytes(out, f.data);
  }

  const cdStart = out.length;
  files.forEach((f, i) => {
    const nameBytes = enc.encode(f.name);
    const crc = crc32(f.data);
    pushU32(central, 0x02014b50);
    pushU16(central, 20);
    pushU16(central, 20);
    pushU16(central, 0);
    pushU16(central, 0);
    pushU16(central, 0);
    pushU16(central, 0);
    pushU32(central, crc);
    pushU32(central, f.data.length);
    pushU32(central, f.data.length);
    pushU16(central, nameBytes.length);
    pushU16(central, 0);
    pushU16(central, 0);
    pushU16(central, 0);
    pushU16(central, 0);
    pushU32(central, 0);
    pushU32(central, offsets[i]);
    pushBytes(central, nameBytes);
  });

  pushBytes(out, Uint8Array.from(central));
  const cdSize = central.length;

  pushU32(out, 0x06054b50);
  pushU16(out, 0);
  pushU16(out, 0);
  pushU16(out, files.length);
  pushU16(out, files.length);
  pushU32(out, cdSize);
  pushU32(out, cdStart);
  pushU16(out, 0);

  return Uint8Array.from(out);
}

// ── Публічне API ─────────────────────────────────────────────────────────────

/** Будує байти .xlsx з аркушів. */
export function buildXlsx(sheets: Sheet[]): Uint8Array {
  const safe = sheets.map((s, i) => ({
    ...s,
    name: sanitizeSheetName(s.name, i),
  }));

  const overrides: string[] = [
    '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
    '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>',
  ];
  safe.forEach((s, i) => {
    overrides.push(
      `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`,
    );
    if (s.chart) {
      overrides.push(
        `<Override PartName="/xl/drawings/drawing${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`,
        `<Override PartName="/xl/charts/chart${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`,
      );
    }
  });

  const contentTypes =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">' +
    '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>' +
    '<Default Extension="xml" ContentType="application/xml"/>' +
    overrides.join("") +
    "</Types>";

  const rootRels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>' +
    "</Relationships>";

  const workbook =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>' +
    safe
      .map(
        (s, i) =>
          `<sheet name="${escapeXml(s.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`,
      )
      .join("") +
    "</sheets></workbook>";

  const stylesRid = safe.length + 1;
  const workbookRels =
    '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
    '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
    safe
      .map(
        (_, i) =>
          `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`,
      )
      .join("") +
    `<Relationship Id="rId${stylesRid}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    "</Relationships>";

  const files: ZipFile[] = [
    { name: "[Content_Types].xml", data: enc.encode(contentTypes) },
    { name: "_rels/.rels", data: enc.encode(rootRels) },
    { name: "xl/workbook.xml", data: enc.encode(workbook) },
    { name: "xl/_rels/workbook.xml.rels", data: enc.encode(workbookRels) },
    { name: "xl/styles.xml", data: enc.encode(STYLES_XML) },
  ];

  safe.forEach((s, i) => {
    const n = i + 1;
    files.push({
      name: `xl/worksheets/sheet${n}.xml`,
      data: enc.encode(sheetXml(s)),
    });
    if (s.chart) {
      files.push(
        {
          name: `xl/worksheets/_rels/sheet${n}.xml.rels`,
          data: enc.encode(
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
              '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
              `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${n}.xml"/>` +
              "</Relationships>",
          ),
        },
        {
          name: `xl/drawings/drawing${n}.xml`,
          data: enc.encode(drawingXml(s.chart)),
        },
        {
          name: `xl/drawings/_rels/drawing${n}.xml.rels`,
          data: enc.encode(
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>' +
              '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">' +
              `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart${n}.xml"/>` +
              "</Relationships>",
          ),
        },
        {
          name: `xl/charts/chart${n}.xml`,
          data: enc.encode(chartXml(s)),
        },
      );
    }
  });

  return zipStore(files);
}

/** Завантажує аркуші як .xlsx-файл. */
export function downloadXlsx(filename: string, sheets: Sheet[]): void {
  const bytes = buildXlsx(sheets);
  // Копія в чистий ArrayBuffer — Blob очікує ArrayBuffer, не SharedArrayBuffer.
  const blob = new Blob([bytes.slice().buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
