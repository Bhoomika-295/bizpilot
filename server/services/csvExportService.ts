/**
 * Serialize tabular values into RFC 4180-compatible CSV.
 *
 * Every field is quoted so commas, line breaks, and embedded quotes remain
 * unambiguous. Values that could be interpreted as spreadsheet formulas are
 * prefixed with an apostrophe to prevent execution when opened in a sheet.
 */
export function escapeCsvCell(value: unknown): string {
  if (value === null || value === undefined) return '""';

  let text = value instanceof Date ? value.toISOString() : String(value);
  if (/^\s*[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

export function buildCsvContent(headers: string[], rows: unknown[][]): string {
  const lines = [
    headers.map(escapeCsvCell).join(","),
    ...rows.map((row) => row.map(escapeCsvCell).join(",")),
  ];

  return `${lines.join("\r\n")}\r\n`;
}

export type CsvDateRange = {
  startTimestamp?: number;
  endTimestamp?: number;
};

export class CsvDateRangeValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CsvDateRangeValidationError";
  }
}

function parseDateInput(value: string, fieldName: "startDate" | "endDate"): Date {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new CsvDateRangeValidationError(
      `${fieldName} must be a valid date in YYYY-MM-DD format.`,
    );
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== value) {
    throw new CsvDateRangeValidationError(`${fieldName} must be a valid calendar date.`);
  }

  return parsed;
}

/**
 * Converts optional date-only inputs into inclusive UTC epoch-millisecond bounds.
 * The end date is expanded to the final millisecond of its UTC day so records on
 * the boundary date are included.
 */
export function parseCsvDateRange(startDate?: string, endDate?: string): CsvDateRange {
  const start = startDate ? parseDateInput(startDate, "startDate") : undefined;
  const end = endDate ? parseDateInput(endDate, "endDate") : undefined;

  const startTimestamp = start?.getTime();
  const endTimestamp = end ? end.getTime() + 24 * 60 * 60 * 1000 - 1 : undefined;

  if (
    startTimestamp !== undefined &&
    endTimestamp !== undefined &&
    startTimestamp > endTimestamp
  ) {
    throw new CsvDateRangeValidationError("startDate must be on or before endDate.");
  }

  return { startTimestamp, endTimestamp };
}
