import type { CsvColumn, CsvParsingOutput } from "../type";

export function buildRows(
  parsed: CsvParsingOutput,
  matches: Map<string, CsvColumn>,
  duplicatedIndices: Set<number>
): Record<string, string>[] | undefined {
  if (parsed.rows.length === 0) return undefined;

  const indexToKey = new Map<number, string>();
  for (let i = 0; i < parsed.headers.length; i++) {
    if (duplicatedIndices.has(i)) continue;
    const col = matches.get(parsed.headers[i]);
    if (col) indexToKey.set(i, col.key);
  }

  if (indexToKey.size === 0) return undefined;

  return parsed.rows.map((row) => {
    const record: Record<string, string> = {};
    for (const [idx, key] of indexToKey) {
      record[key] = row[idx] ?? "";
    }
    return record;
  });
}
