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
