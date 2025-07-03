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

export function dataToRecords(data: string[][]): RowData[] {
    const headers = data[0].map((header) => header.toLowerCase());
    const keyIndex = headers.indexOf("key");
    const valueIndex = headers.indexOf("value");
    const items: RowData[] = [];

    data.forEach((columns, index) => {
        let key, value;
        if (keyIndex !== -1 && valueIndex !== -1) {
            if (index === 0) return;
            key = columns[keyIndex];
            value = columns[valueIndex];
        } else {
            [key, value] = columns;
        }

        if (key && value) {
            items.push({ key, value });
        }
    });

    return items;
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

export function updateItems(
    oldItems: RowData[],
    newItems: RowData[]
): RowData[] {
    const updatedItems = [...oldItems];

    newItems.forEach((newItem) => {
        const index = updatedItems.findIndex(
            (item) => item.key === newItem.key
        );

        if (index !== -1) {
            updatedItems[index] = newItem;
        } else {
            updatedItems.push(newItem);
        }
    });

    return updatedItems;
}
