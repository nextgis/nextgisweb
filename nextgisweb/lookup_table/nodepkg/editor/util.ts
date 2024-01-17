import type { RecordOption } from "@nextgisweb/gui/edi-table/store/RecordItem";
import { downloadCsv } from "@nextgisweb/gui/util";

import type { LookupTableResource } from "../type/LookupTableResource";

export function exportToCsv(items: RecordOption[]) {
    const csvContent = items
        .map((item) => `"${item.key}","${item.value}"`)
        .join("\n");

    downloadCsv(csvContent, "lookup_table.csv");
}

export function dataToRecords(data: string[][]): RecordOption[] {
    const headers = data[0].map((header) => header.toLowerCase());
    const keyIndex = headers.indexOf("key");
    const valueIndex = headers.indexOf("value");
    const items: RecordOption[] = [];

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

export function recordsToLookup(
    items: RecordOption[]
): LookupTableResource["items"] {
    const result: LookupTableResource["items"] = {};
    items.forEach(({ key, value }) => {
        if (key) {
            result[key] = String(value);
        }
    });
    return result;
}

export function updateItems(
    oldItems: RecordOption[],
    newItems: RecordOption[]
): RecordOption[] {
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
