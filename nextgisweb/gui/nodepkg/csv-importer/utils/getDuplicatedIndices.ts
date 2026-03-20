import type { CsvColumn } from "../type";

export function getDuplicatedIndices(
  csvHeaders: string[],
  matches: Map<string, CsvColumn>
): Set<number> {
  const seen = new Set<string>();
  const duplicated = new Set<number>();

  for (let i = 0; i < csvHeaders.length; i++) {
    const key = matches.get(csvHeaders[i])?.key;
    if (key) {
      if (seen.has(key)) {
        duplicated.add(i);
      } else {
        seen.add(key);
      }
    }
  }

  return duplicated;
}
