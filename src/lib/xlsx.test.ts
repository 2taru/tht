import { describe, it, expect } from "vitest";
import { buildXlsx } from "./xlsx";

const decode = (bytes: Uint8Array) => new TextDecoder().decode(bytes);

describe("buildXlsx", () => {
  it("produces a ZIP with the PK signature", () => {
    const bytes = buildXlsx([{ name: "Sheet1", rows: [["a"], ["b"]] }]);
    expect(bytes[0]).toBe(0x50); // P
    expect(bytes[1]).toBe(0x4b); // K
    expect(bytes[2]).toBe(0x03);
    expect(bytes[3]).toBe(0x04);
  });

  it("stores strings as inlineStr and numbers as values (STORE = literal text)", () => {
    const bytes = buildXlsx([
      { name: "Дані", rows: [["Задача", "Години"], ["Верстка", 6.5]] },
    ]);
    const text = decode(bytes);
    expect(text).toContain("t=\"inlineStr\"");
    expect(text).toContain("Верстка");
    expect(text).toContain("<v>6.5</v>");
    // жирний стиль для заголовка
    expect(text).toContain('s="1"');
  });

  it("escapes XML special chars and neutralises formulas as text", () => {
    const bytes = buildXlsx([
      { name: "S", rows: [["h"], ["=1+2 & <b>"]] },
    ]);
    const text = decode(bytes);
    expect(text).toContain("=1+2 &amp; &lt;b&gt;");
  });

  it("declares one worksheet part per sheet", () => {
    const bytes = buildXlsx([
      { name: "One", rows: [["x"]] },
      { name: "Two", rows: [["y"]] },
    ]);
    const text = decode(bytes);
    expect(text).toContain("worksheets/sheet1.xml");
    expect(text).toContain("worksheets/sheet2.xml");
  });

  it("sanitises invalid sheet names", () => {
    const bytes = buildXlsx([{ name: "a/b:c*?[d]", rows: [["x"]] }]);
    const text = decode(bytes);
    expect(text).not.toContain("a/b:c");
  });

  it("emits column widths when provided", () => {
    const bytes = buildXlsx([
      { name: "S", rows: [["a", "b"]], columns: [{ width: 20 }, { width: 12 }] },
    ]);
    const text = decode(bytes);
    expect(text).toContain('<cols>');
    expect(text).toContain('width="20"');
  });

  it("embeds a bar chart with drawing + chart parts", () => {
    const bytes = buildXlsx([
      {
        name: "Задачі",
        rows: [
          ["Задача", "Години"],
          ["Верстка", 6.5],
          ["API", 4],
        ],
        chart: {
          title: "Години по задачах",
          categoryCol: 0,
          valueCol: 1,
          seriesNameRow: 1,
          dataFirstRow: 2,
          dataLastRow: 3,
          anchor: { fromCol: 0, fromRow: 4, toCol: 6, toRow: 20 },
        },
      },
    ]);
    const text = decode(bytes);
    expect(text).toContain("xl/charts/chart1.xml");
    expect(text).toContain("xl/drawings/drawing1.xml");
    expect(text).toContain("<c:barChart>");
    expect(text).toContain("<drawing r:id=\"rId1\"/>");
    // категорії/значення потрапили в кеш графіка
    expect(text).toContain("Верстка");
    expect(text).toContain("<c:v>6.5</c:v>");
  });
});
