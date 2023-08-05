import { route } from "@nextgisweb/pyramid/api";

export interface DeleteFeaturesOptions {
    resourceId: number;
    featureIds: number[];
}

export interface DeleteFeatureOptions {
    resourceId: number;
    featureId: number;
}

export async function deleteFeatures({
    resourceId,
    featureIds,
}: DeleteFeaturesOptions): Promise<unknown> {
    return route("feature_layer.feature.collection", resourceId).delete({
        json: featureIds.map((id) => ({ id })),
    });
}

export function deleteFeature({
    resourceId,
    featureId,
}: DeleteFeatureOptions): Promise<unknown> {
    return route("feature_layer.feature.item", {
        id: resourceId,
        fid: featureId,
    }).delete();
}
