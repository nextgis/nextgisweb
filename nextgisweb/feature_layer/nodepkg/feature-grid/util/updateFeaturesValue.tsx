import { route } from "@nextgisweb/pyramid/api";

import type { FeatureLayer, NgwAttributeType } from "../../type";
import { getFeatureFieldValue } from "../../util/getFeatureFieldValue";

type Item = Record<string, NgwAttributeType>;

interface UpdateFeaturesValue {
    resourceId: number;
    data: Item[];
    signal?: AbortSignal;
}

export async function updateFeaturesValue({
    resourceId,
    signal,
    data,
}: UpdateFeaturesValue) {
    const res = await route("resource.item", resourceId).get({
        cache: true,
    });
    const featureLayer = res.feature_layer as FeatureLayer;
    if (!featureLayer) {
        throw new Error("");
    }
    const newData: Item[] = [];
    for (const item of data) {
        const newItem: Item = {};
        for (const [key, value] of Object.entries(item)) {
            const field = featureLayer.fields.find((f) => f.keyname === key);
            if (field) {
                newItem[key] = (await getFeatureFieldValue(value, field, {
                    signal,
                })) as NgwAttributeType;
            } else {
                newItem[key] = value;
            }
        }
        newData.push(newItem);
    }
    return newData;
}
