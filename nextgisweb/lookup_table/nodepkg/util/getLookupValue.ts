import type { RequestOptionsByMethod } from "@nextgisweb/pyramid/api/type";

import { getLookupTableItems } from "./getLookupTableItems";

export async function getLookupValue(
    value: unknown,
    lookupId: number,
    requestOptions?: RequestOptionsByMethod<"get">
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
