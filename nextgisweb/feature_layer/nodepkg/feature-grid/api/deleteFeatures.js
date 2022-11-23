import { route } from "@nextgisweb/pyramid/api";

export async function deleteFeatures({ resourceId, featureIds }) {
    return route("feature_layer.feature.collection", resourceId).delete({
        json: featureIds.map((id) => ({ id })),
    });
}

export function deleteFeature({ resourceId, featureId }) {
    return route("feature_layer.feature.item", resourceId, featureId).delete();
}
