import type { Display } from "@nextgisweb/webmap/display";

import type { FeatureInfo, IdentifyInfo, RasterInfo } from "../identification";

export function identifyInfoToFeaturesInfo(
    identifyInfo: IdentifyInfo,
    display: Display
): (FeatureInfo | RasterInfo)[] {
    if (!identifyInfo) {
        return [];
    }

    const { response, layerLabels } = identifyInfo;
    const layersResponse = Object.keys(response);
    const featuresInfo: (FeatureInfo | RasterInfo)[] = [];

    display.itemStore.fetch({
        queryOptions: { deep: true },
        query: { type: "layer" },
        onItem: (item) => {
            const itemObj = display.itemStore.dumpItem(item);
            if (itemObj.type === "layer") {
                const layerId = itemObj.layerId;
                const layerIdx = layersResponse.indexOf(layerId.toString());

                const layerResponse = response[layerId];
                if (layerIdx === -1) {
                    return;
                }
                if ("features" in layerResponse) {
                    layerResponse.features.forEach((f, idx) => {
                        const id = f.id;
                        const value = `${layerId}-${id}`;
                        const label = `${f.label} (${layerLabels[layerId]})`;
                        featuresInfo.push({
                            id,
                            value,
                            label,
                            layerId,
                            idx,
                            type: "feature_layer",
                        });
                    });
                } else if ("color_interpretation" in layerResponse) {
                    const label = `${layerLabels[layerId]}`;
                    featuresInfo.push({
                        type: "raster_layer",
                        value: `R-${layerId}`,
                        label,
                        layerId,
                    });
                }
                layersResponse.splice(layerIdx, 1);
            }
        },
    });

    return featuresInfo;
}
