import { describe, expect, it } from "vitest";
import { parseEntriesFile } from "./importParse";

function csvFile(content: string): File {
  return new File([content], "test.csv", { type: "text/csv" });
}

describe("parseEntriesFile", () => {
  it("парсить валідний CSV (укр заголовки, ДД.ММ.РРРР)", async () => {
    const csv =
      "дата,проєкт,початок,кінець,опис\n" +
      "23.06.2026,SkyInsure,9:00,10:30,Робота\n";
    const { rows, invalid } = await parseEntriesFile(csvFile(csv));
    expect(invalid).toBe(0);
    expect(rows).toEqual([
      {
        date: "2026-06-23",
        projectName: "SkyInsure",
        startMinute: 540,
        endMinute: 630,
        description: "Робота",
      },
    ]);
  });

  it("рахує некоректні рядки (end<=start, без дати)", async () => {
    const csv =
      "date,project,start,end,description\n" +
      "2026-06-23,A,10:00,09:00,bad-range\n" +
      ",B,09:00,10:00,no-date\n" +
      "2026-06-23,C,09:00,10:00,ok\n";
    const { rows, invalid } = await parseEntriesFile(csvFile(csv));
    expect(rows.length).toBe(1);
    expect(rows[0].projectName).toBe("C");
    expect(invalid).toBe(2);
  });
});
