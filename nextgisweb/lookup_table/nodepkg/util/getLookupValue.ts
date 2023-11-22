import type { RequestOptions } from "@nextgisweb/pyramid/api/type";

import { getLookupTableItems } from "./getLookupTableItems";

export async function getLookupValue(
    value: unknown,
    lookupId: number,
    requestOptions?: RequestOptions
) {
    try {
        const items = await getLookupTableItems(lookupId, requestOptions);
        const lookupValue = items[value as string];
        if (lookupValue !== undefined) {
            value = lookupValue;
        }
    } catch {
        // Ignore
    }

    return value;
}
