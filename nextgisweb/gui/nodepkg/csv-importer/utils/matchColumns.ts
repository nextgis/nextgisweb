import type { TargetColumn } from "../type";

export function matchColumns(
  csvColumns: string[],
  targetColumns: TargetColumn[]
): Map<TargetColumn, number> {
  const result = new Map<TargetColumn, number>();
  const usedKeys = new Set<string>();

  for (const tColumn of targetColumns) {
    if (usedKeys.has(tColumn.key)) {
      continue;
    }
    for (let i = 0; i < csvColumns.length; i++) {
      const cColumnLabel = csvColumns[i]?.trim().toLowerCase();

      if (
        tColumn.aliases.some(
          (alias) => alias.trim().toLowerCase() === cColumnLabel
        )
      ) {
        result.set(tColumn, i);
        usedKeys.add(tColumn.key);
        break;
      }
    }
  }

  return result;
}
