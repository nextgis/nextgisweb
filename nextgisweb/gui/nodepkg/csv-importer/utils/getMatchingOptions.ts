import type { TargetColumn } from "../type";

export function getMatchingOptions(
  targetColumns: TargetColumn[],
  csvColumns: string[],
  matches: Map<TargetColumn, number>
): Map<TargetColumn, number[]> {
  const result = new Map<TargetColumn, number[]>();

  for (const tColumn of targetColumns) {
    const matchedIndex = matches.get(tColumn);

    const occupiedByOthers = new Set(
      Array.from(matches.entries())
        .filter(([t]) => t !== tColumn)
        .map(([, i]) => i)
    );

    const availableIndices = csvColumns
      .map((_, i) => i)
      .filter((i) => i === matchedIndex || !occupiedByOthers.has(i));

    result.set(tColumn, availableIndices);
  }

  return result;
}
