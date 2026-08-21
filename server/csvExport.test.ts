import { describe, expect, it } from "vitest";
import {
  buildCsvContent,
  CsvDateRangeValidationError,
  escapeCsvCell,
  parseCsvDateRange,
} from "./services/csvExportService";

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

  it("returns no bounds when no dates are supplied", () => {
    expect(parseCsvDateRange()).toEqual({});
  });

  it("supports start-only and end-only ranges", () => {
    expect(parseCsvDateRange("2026-08-10")).toEqual({
      startTimestamp: Date.parse("2026-08-10T00:00:00.000Z"),
    });
    expect(parseCsvDateRange(undefined, "2026-08-10")).toEqual({
      endTimestamp: Date.parse("2026-08-10T23:59:59.999Z"),
    });
  });

  it("creates an inclusive UTC range for both dates", () => {
    expect(parseCsvDateRange("2026-08-10", "2026-08-12")).toEqual({
      startTimestamp: Date.parse("2026-08-10T00:00:00.000Z"),
      endTimestamp: Date.parse("2026-08-12T23:59:59.999Z"),
    });
  });

  it("rejects malformed calendar dates and reversed ranges", () => {
    expect(() => parseCsvDateRange("2026-02-30")).toThrowError(
      new CsvDateRangeValidationError("startDate must be a valid calendar date."),
    );
    expect(() => parseCsvDateRange(undefined, "08/10/2026")).toThrowError(
      new CsvDateRangeValidationError("endDate must be a valid date in YYYY-MM-DD format."),
    );
    expect(() => parseCsvDateRange("2026-08-12", "2026-08-10")).toThrowError(
      new CsvDateRangeValidationError("startDate must be on or before endDate."),
    );
  });
});
