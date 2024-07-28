import type { FeatureLayerFieldRead } from "@nextgisweb/feature-layer/type/api";
import { getLookupValue } from "@nextgisweb/lookup-table/util/getLookupValue";
import type { RequestOptionsByMethod } from "@nextgisweb/pyramid/api/type";

export async function getFeatureFieldValue(
    fieldValue: unknown,
    field: FeatureLayerFieldRead,
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
