export function toCsvValue(value: unknown): string {
  const str =
    value == null ? "" : Array.isArray(value) ? value.join("; ") : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function toCsv(rows: Record<string, unknown>[], columns: string[]): string {
  const header = columns.map(toCsvValue).join(",");
  const body = rows.map((row) => columns.map((col) => toCsvValue(row[col])).join(","));
  return [header, ...body].join("\n");
}
