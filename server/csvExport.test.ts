import { describe, expect, it } from "vitest";
import { buildCsvContent, escapeCsvCell } from "./services/csvExportService";

describe("CSV export serialization", () => {
  it("quotes headers and cells so commas, quotes, and newlines remain valid CSV", () => {
    const csv = buildCsvContent(
      ["Name", "Notes"],
      [["Acme, Inc.", "Said \"hello\"\nthen left"]]
    );

    expect(csv).toBe(
      '"Name","Notes"\r\n"Acme, Inc.","Said ""hello""\nthen left"\r\n'
    );
  });

  it("serializes dates as ISO timestamps and nullish values as empty cells", () => {
    const csv = buildCsvContent(
      ["When", "Optional"],
      [[new Date("2026-08-21T12:34:56.000Z"), null], [undefined, "value"]]
    );

    expect(csv).toBe(
      '"When","Optional"\r\n"2026-08-21T12:34:56.000Z",""\r\n"","value"\r\n'
    );
  });

  it("neutralizes spreadsheet formula prefixes", () => {
    expect(escapeCsvCell("=SUM(A1:A2)")).toBe('"\'=SUM(A1:A2)"');
    expect(escapeCsvCell(" @user")).toBe('"\' @user"');
  });
});
