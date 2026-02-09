export type CsvColumn<T> = {
  header: string;
  key: keyof T;
};

function toCell(value: unknown): string {
  if (value == null) return "";
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "string") return value;
  if (typeof value === "number") return Number.isFinite(value) ? String(value) : "";
  if (typeof value === "boolean") return value ? "true" : "false";
  if (typeof value === "bigint") return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

function escapeCsv(value: string): string {
  // RFC 4180-ish: quote if special chars are present; double quotes inside quoted fields.
  if (value.includes('"') || value.includes(",") || value.includes("\n") || value.includes("\r")) {
    return `"${value.replaceAll('"', '""')}"`;
  }
  return value;
}

export function toCsv<T extends Record<string, unknown>>(params: {
  columns: Array<CsvColumn<T>>;
  rows: T[];
}): string {
  const header = params.columns.map((c) => escapeCsv(c.header)).join(",");
  const lines: string[] = [header];

  for (const row of params.rows) {
    const line = params.columns
      .map((c) => escapeCsv(toCell(row[c.key])))
      .join(",");
    lines.push(line);
  }

  return lines.join("\n") + "\n";
}

