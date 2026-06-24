import { describe, expect, it } from "vitest";
import { toCsv } from "./csv";

describe("csv", () => {
  it("екранує коми/лапки/переноси", () => {
    const out = toCsv(["a", "b"], [["x,y", 'він "сказав"']]);
    expect(out).toBe('a,b\n"x,y","він ""сказав"""');
  });

  it("нейтралізує CSV-формули (CWE-1236)", () => {
    const out = toCsv(
      ["проєкт"],
      [["=HYPERLINK(1)"], ["+1"], ["-2"], ["@cmd"]],
    );
    const lines = out.split("\n");
    // кожне небезпечне значення отримує префікс ' (стає текстом у Excel)
    expect(lines[1]).toBe("'=HYPERLINK(1)");
    expect(lines[2]).toBe("'+1");
    expect(lines[3]).toBe("'-2");
    expect(lines[4]).toBe("'@cmd");
  });

  it("не чіпає звичайний текст і числа", () => {
    const out = toCsv(["h"], [["Звичайний"], [42], [-5]]);
    const lines = out.split("\n");
    expect(lines[1]).toBe("Звичайний");
    expect(lines[2]).toBe("42");
    // числа — наші обчислені значення, не префіксуються
    expect(lines[3]).toBe("-5");
  });
});
