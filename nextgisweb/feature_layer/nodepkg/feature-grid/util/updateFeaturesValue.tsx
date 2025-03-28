import { assert } from "@nextgisweb/jsrealm/error";
import { route } from "@nextgisweb/pyramid/api";

import type { NgwAttributeType } from "../../type";
import { getFeatureFieldValue } from "../../util/getFeatureFieldValue";
import { $FID, $VID } from "../constant";

type Item = Record<string, NgwAttributeType> & {
    [$FID]: number;
    [$VID]?: number;
};

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

    const featureLayer = res.feature_layer;
    assert(featureLayer);

    const newData: Item[] = [];
    for (const item of data) {
        const newItem: Item = { [$FID]: item[$FID] };

        const vid = item[$VID];
        if (vid) newItem[$VID] = vid;

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
