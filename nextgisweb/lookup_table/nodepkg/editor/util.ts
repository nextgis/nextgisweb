import { unparse } from "papaparse";

import { downloadCsv } from "@nextgisweb/gui/util";
import type { LookupTableRead } from "@nextgisweb/lookup-table/type/api";

export interface RowData {
  key: string;
  value: string;
}

export function exportToCsv(items: RowData[]) {
  const serializedItems = items.map((item) => {
    return [item.key as string, item.value as string];
  });

  const csvContent = unparse<string[]>(serializedItems);

  downloadCsv(csvContent, "lookup_table.csv");
}

export function recordsToLookup(items: RowData[]): LookupTableRead["items"] {
  const result: LookupTableRead["items"] = {};
  items.forEach(({ key, value }) => {
    if (key) {
      result[key] = String(value);
    }
  });
  return result;
}
