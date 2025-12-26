import { Feature as OlFeature } from "ol";
import WKT from "ol/format/WKT";
import type { Geometry } from "ol/geom";
import type { GeometryLayout, Type as OlGeometryType } from "ol/geom/Geometry";
import type VectorSource from "ol/source/Vector";

import { route } from "@nextgisweb/pyramid/api";
import topic from "@nextgisweb/webmap/compat/topic";
import type { Display } from "@nextgisweb/webmap/display";
import type { TreeLayerStore } from "@nextgisweb/webmap/store/tree-store/TreeItemStore";
import {
    getOlGeometryType,
    getOlLayout,
} from "@nextgisweb/webmap/utils/geometry-types";

import type { FeatureToSave, FeaturesToSave } from "./type";

const wkt = new WKT();

export async function fetchResourceOlFeature({
    resourceId,
    signal,
}: {
    resourceId: number;
    signal?: AbortSignal;
}): Promise<OlFeature<Geometry>[]> {
    const resp = await route("feature_layer.feature.collection", {
        id: resourceId,
    }).get({
        query: { dt_format: "iso", fields: [], extensions: [] },
        signal,
    });
    const olFeatures: OlFeature<Geometry>[] = [];
    for (const featureInfo of resp as Array<{
        id: number;
        geom?: string;
    }>) {
        if (!featureInfo.geom) {
            continue;
        }
        olFeatures.push(
            new OlFeature({
                id: featureInfo.id,
                layer_id: resourceId,
                geometry: wkt.readGeometry(featureInfo.geom),
                deleted: false,
            })
        );
    }
    return olFeatures;
}

export interface GeomConfig {
    type: OlGeometryType;
    layout: GeometryLayout;
}

export async function getGeomConfig({
    resourceId,
    signal,
}: {
    resourceId: number;
    signal?: AbortSignal;
}): Promise<GeomConfig> {
    const resp = await route("resource.item", {
        id: resourceId,
    }).get({
        query: { fields: [], extensions: [] },
        signal,
    });
    if (!resp.feature_layer) {
        throw new Error(`Resource ${resourceId} is not a feature layer`);
    }
    const type = resp.feature_layer.geometry_type;
    return {
        type: getOlGeometryType(type),
        layout: getOlLayout(type),
    };
}

function getFeaturesToSave({
    source,
    resourceId,
}: {
    resourceId: number;
    source: VectorSource;
}): FeaturesToSave {
    const featuresToPatch: FeatureToSave[] = [];
    const featuresToDelete: FeatureToSave[] = [];

    const features = source
        .getFeatures()
        .filter((f) => f.get("layer_id") === resourceId);

    features.forEach((feature) => {
        const isNew = !feature.get("id");
        const isModified =
            !isNew && !feature.get("deleted") && feature.getRevision() > 1;
        const isDeleted = feature.get("deleted");

        let featureToSave: Partial<FeatureToSave> | undefined = undefined;

        const attribution = feature.get("attribution") || {};
        if (isNew) {
            featureToSave = { ...attribution };
        } else if (isModified || isDeleted) {
            featureToSave = { ...attribution, id: feature.get("id") };
        }

        if (featureToSave) {
            const geom = wkt.writeGeometry(feature.getGeometry()!);

            if (isDeleted) {
                featuresToDelete.push({ ...featureToSave, geom });
            } else {
                featuresToPatch.push({ ...featureToSave, geom });
            }
        }
    });

    return {
        toPatch: featuresToPatch,
        toDelete: featuresToDelete,
    };
}

async function patchFeaturesOnServer({
    resourceId,
    features,
}: {
    resourceId: number;
    features: FeatureToSave[];
}): Promise<void> {
    if (resourceId === null || !features || features.length < 1) return;

    await route("feature_layer.feature.collection", {
        id: resourceId,
    }).patch({
        // @ts-expect-error TODO: define patch payload for feature_layer.feature.collection
        json: features,
        query: { dt_format: "iso" },
    });
}

async function deleteFeaturesOnServer({
    resourceId,
    features,
}: {
    resourceId: number;
    features: FeatureToSave[];
}): Promise<void> {
    if (resourceId === null || !features || features.length < 1) return;

    await route("feature_layer.feature.collection", {
        id: resourceId,
    }).delete({
        json: features,
    });
}

export async function saveChanges({
    item,
    source,
    display,
}: {
    item: TreeLayerStore;
    display: Display;
    source: VectorSource;
}): Promise<void> {
    const resourceId = item.layerId;
    const { toPatch, toDelete } = getFeaturesToSave({
        source,
        resourceId,
    });

    try {
        await Promise.all([
            patchFeaturesOnServer({ resourceId, features: toPatch }),
            deleteFeaturesOnServer({ resourceId, features: toDelete }),
        ]);

        display.map.getLayer(item.id)?.reload();

        topic.publish("/webmap/feature-table/refresh", item.layerId);
    } catch (err) {
        console.error("Error saving changes:", err);
    }
}
