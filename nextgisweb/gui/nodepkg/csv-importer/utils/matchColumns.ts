import type { CsvColumn } from "../type";

export function matchColumns(
  csvHeaders: string[],
  columns: CsvColumn[]
): Map<string, CsvColumn> {
  const result = new Map<string, CsvColumn>();

  for (const header of csvHeaders) {
    const normalized = header.trim().toLowerCase();
    for (const column of columns) {
      if (
        column.aliases.some(
          (alias) => alias.trim().toLowerCase() === normalized
        )
      ) {
        result.set(header, column);
        break;
      }
    }
  }

  return result;
}
