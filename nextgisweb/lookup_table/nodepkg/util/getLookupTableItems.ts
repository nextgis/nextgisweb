import { route } from "@nextgisweb/pyramid/api";
import type { RequestOptionsByMethod } from "@nextgisweb/pyramid/api/type";
import type { ResourceItem } from "@nextgisweb/resource/type/Resource";

const EXCLUDED_IDS: number[] = [];

export async function getLookupTableItems(
    lookupId: number,
    requestOptions?: RequestOptionsByMethod<"get">
): Promise<Record<string, string>> {
    if (!EXCLUDED_IDS.includes(lookupId)) {
        try {
            const resourceItem = await route(
                "resource.item",
                lookupId
            ).get<ResourceItem>({
                cache: true,
                ...requestOptions,
            });
            if (!resourceItem.lookup_table) {
                throw new Error(`Resource ${lookupId} is not lookup table`);
            }
            return resourceItem.lookup_table.items;
        } catch (er) {
            EXCLUDED_IDS.push(lookupId);
            throw er;
        }
    }
    throw new Error(`Lookupp table ${lookupId} not founded`);
}
