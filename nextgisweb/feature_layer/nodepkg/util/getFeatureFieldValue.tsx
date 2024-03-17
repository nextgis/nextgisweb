import { getLookupValue } from "@nextgisweb/lookup-table/util/getLookupValue";
import type { RequestOptionsByMethod } from "@nextgisweb/pyramid/api/type";

import type { FeatureLayerField } from "../type/FeatureLayer";

export async function getFeatureFieldValue(
    fieldValue: unknown,
    field: FeatureLayerField,
    requestOptions?: RequestOptionsByMethod<"get">
) {
    if (field.lookup_table) {
        return getLookupValue(
            fieldValue,
            field.lookup_table.id,
            requestOptions
        );
    }
    return fieldValue;
}
