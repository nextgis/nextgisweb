import { route } from "@nextgisweb/pyramid/api";
import type { RequestOptions } from "@nextgisweb/pyramid/api/type";
import type { ResourceItem } from "@nextgisweb/resource/type/Resource";

const EXCLUDED_IDS: number[] = [];

export async function getLookupValue(
    value: unknown,
    lookupId: number,
    requestOptions?: RequestOptions
) {
    if (!EXCLUDED_IDS.includes(lookupId)) {
        try {
            const resourceItem = await route(
                "resource.item",
                lookupId
            ).get<ResourceItem>({
                cache: true,
                ...requestOptions,
            });
            if (resourceItem.lookup_table) {
                const lookupValue =
                    resourceItem.lookup_table.items[value as string];
                if (lookupValue !== undefined) {
                    value = lookupValue;
                }
            }
        } catch {
            EXCLUDED_IDS.push(lookupId);
            console.warn(`Lookupp table ${lookupId} not founded`);
        }
    }
    return value;
}
