import { route } from "@nextgisweb/pyramid/api";
import type { FeatureLayerWebMapPluginConfig } from "@nextgisweb/webmap/plugin/type";

import type { SearchFunction, SearchResult, SearchResultGroup } from "../type";

interface FeatureResponse {
  id: number;
  label: string;
  geom: any;
}

export const searchByLayers: SearchFunction = async (
  criteria,
  limit,
  display,
  controller,
  geoJSON
) => {
  const visibleItems = display.getVisibleItems();
  const requests: {
    layerName: string;
    layerId: number;
    styleId: number;
    identifiable: boolean;
    request: Promise<FeatureResponse[]>;
  }[] = [];
  visibleItems.forEach((item) => {
    if (!item.isLayer()) {
      return;
    }
    const pluginConfig = item.plugin[
      "@nextgisweb/webmap/plugin/feature-layer"
    ] as FeatureLayerWebMapPluginConfig;

    if (pluginConfig === undefined || !pluginConfig.likeSearch) return;

    const signal = controller.makeSignal();
    const request = route("feature_layer.feature.collection", item.layerId).get(
      {
        query: {
          limit: limit,
          geom_format: "geojson",
          label: true,
          dt_format: "iso",
          fields: [],
          extensions: [],
          // @ts-expect-error not in tsgen api yet
          ilike: criteria,
        },
        signal,
      }
    );
    requests.push({
      layerName: item.label,
      layerId: item.layerId,
      styleId: item.styleId,
      identifiable: item.identifiable,
      request,
    });
  });

  const results = await Promise.allSettled(requests.map((r) => r.request));
  const groups: SearchResultGroup[] = [];
  let isExceeded = false;
  results.forEach((r, index) => {
    if (r.status !== "fulfilled" || !r.value || limit < 1) return;
    const { layerName, layerId, styleId, identifiable } = requests[index];
    const children: SearchResult[] = [];
    r.value.forEach((feature) => {
      if (isExceeded) return;
      children.push({
        label: feature.label,
        geometry: geoJSON.readGeometry(feature.geom),
        key: limit,
        featureId: feature.id,
      });
      limit = limit - 1;
      isExceeded = limit < 1;
    });
    if (children.length > 0) {
      groups.push({
        type: "layers",
        label: layerName,
        resourceId: layerId,
        styleId,
        identifiable,
        children,
      });
    }
  });

  return [limit, groups, isExceeded];
};
