import { route } from "@nextgisweb/pyramid/api";
import type { ResourceItem } from "@nextgisweb/resource/type/Resource";

import { getFeatureFieldValue } from "./getFeatureFieldValue";

interface UpdateFeaturesValue {
    resourceId: number;
    data: any[];
}

export async function updateFeaturesValue({
    resourceId,
    data,
}: UpdateFeaturesValue) {
    const res = await route("resource.item", resourceId).get<ResourceItem>({
        cache: true,
    });
    const featureLayer = res.feature_layer;
    if (!featureLayer) {
        throw new Error("");
    }
    const newData = [];
    for (const item of data) {
        const newItem = {};
        for (const [key, value] of Object.entries(item)) {
            const field = featureLayer.fields.find((f) => f.keyname === key);
            if (field) {
                newItem[key] = await getFeatureFieldValue(value, field);
            } else {
                console.log(key, value);
                newItem[key] = value;
            }
        }
        newData.push(newItem);
    }
    return newData;
}
