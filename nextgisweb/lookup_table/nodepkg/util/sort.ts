import { uniq } from "lodash-es";

import { assert } from "@nextgisweb/jsrealm/error";
import type { LookupTableRead } from "@nextgisweb/lookup-table/type/api";

type Row = { key: string; value: string };

function comparator(
    sort: LookupTableRead["sort"],
    order?: LookupTableRead["order"]
) {
    if (sort === "CUSTOM") {
        assert(order);
        const orderUnique = uniq(order);
        return (a: Row, b: Row) =>
            orderUnique.indexOf(a.key!) - orderUnique.indexOf(b.key!);
    }

    let f: (row: Row) => string;
    switch (sort) {
        case "KEY_ASC":
        case "KEY_DESC":
            f = (row: Row) => row.key;
            break;
        case "VALUE_ASC":
        case "VALUE_DESC":
            f = (row: Row) => row.value;
            break;
    }

    switch (sort) {
        case "KEY_ASC":
        case "VALUE_ASC":
            return (a: Row, b: Row) => f(a).localeCompare(f(b));
        case "KEY_DESC":
        case "VALUE_DESC":
            return (a: Row, b: Row) => f(b).localeCompare(f(a));
    }
}

export function lookupTableSort<R extends Row>(
    rows: R[],
    sort: LookupTableRead["sort"],
    order?: LookupTableRead["order"]
): R[] {
    return rows.toSorted(comparator(sort, order));
}

export function lookupTableIsSorted<R extends Row>(
    rows: R[],
    sort: LookupTableRead["sort"],
    order?: LookupTableRead["order"]
): boolean {
    const cmp = comparator(sort, order);
    for (let i = 0; i < rows.length - 1; i++) {
        if (cmp(rows[i + 1], rows[i]) < 0) {
            return false;
        }
    }
    return true;
}

export function lookupTableLoadItems(value: LookupTableRead): Row[] {
    return lookupTableSort(
        Object.entries(value.items).map(([key, value]) => {
            return { key, value };
        }),
        "CUSTOM",
        value.order
    );
}
