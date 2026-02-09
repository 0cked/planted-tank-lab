import { describe, expect, test } from "vitest";

import { toCsv } from "@/server/services/admin/csv";

describe("admin CSV utilities", () => {
  test("toCsv escapes commas, quotes, and newlines", () => {
    const csv = toCsv({
      columns: [
        { header: "a", key: "a" },
        { header: "b", key: "b" },
      ],
      rows: [
        {
          a: 'hello,world',
          b: 'he"llo\nx',
        },
      ],
    });

    expect(csv).toContain('"hello,world"');
    expect(csv).toContain('"he""llo');
    expect(csv).toContain('\n');
    expect(csv.endsWith("\n")).toBe(true);
  });

  test("toCsv stringifies objects and handles nulls", () => {
    const csv = toCsv({
      columns: [
        { header: "id", key: "id" },
        { header: "meta", key: "meta" },
        { header: "empty", key: "empty" },
      ],
      rows: [
        {
          id: "x",
          meta: { a: 1 },
          empty: null,
        },
      ],
    });

    // JSON includes quotes, so it must be wrapped and escaped.
    expect(csv).toContain('"{""a"":1}"');
    // Null becomes empty cell.
    expect(csv).toContain("x,");
  });
});

