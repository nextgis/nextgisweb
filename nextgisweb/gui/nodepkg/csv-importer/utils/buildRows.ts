import type { CsvParsingOutput, TargetColumn } from "../type";

export function buildRows(
  parsed: CsvParsingOutput,
  matches: Map<TargetColumn, number>
): Record<string, string>[] | undefined {
  if (parsed.rows.length === 0) return undefined;

  if (matches.size === 0) return undefined;

  return parsed.rows.map((row) => {
    const record: Record<string, string> = {};

    for (const [target, index] of matches) {
      record[target.key] = row[index] ?? "";
    }

    return record;
  });
}
