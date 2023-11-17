import { route } from "@nextgisweb/pyramid/api";

import type { FeatureLayerField } from "../../type/FeatureLayer";

export async function getFeatureFieldValue(
    fieldValue: any,
    field: FeatureLayerField,
    { signal }: { signal?: AbortSignal } = {}
) {
    if (field.lookup_table) {
        const lookup = await route(
            "resource.item",
            field.lookup_table.id
        ).get<any>({
            cache: true,
            signal,
        });
        const value = lookup.lookup_table.items[fieldValue];
        return value || fieldValue;
    }
    return fieldValue;
}
