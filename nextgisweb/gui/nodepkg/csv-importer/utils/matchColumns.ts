import type { CsvColumn } from "../type";

export function matchColumns(
  csvHeaders: string[],
  columns: CsvColumn[]
): Map<string, CsvColumn> {
  const result = new Map<string, CsvColumn>();

  const normalizedHeaders = new Map<string, string>(
    csvHeaders.map((h) => [h.trim().toLowerCase(), h])
  );

  for (const column of columns) {
    for (const alias of column.aliases) {
      const original = normalizedHeaders.get(alias.trim().toLowerCase());
      if (original !== undefined) {
        result.set(original, column);
        break;
      }
    }
  }

  return result;
}
