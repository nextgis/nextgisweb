import { route } from "@nextgisweb/pyramid/api";
import type { FeatureLayerWebMapPluginConfig } from "@nextgisweb/webmap/plugin/type";

import type { SearchFunction, SearchResult } from "../type";

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
  const visibleItems = await display.getVisibleItems();
  const requests: {
    layerId: number;
    identifiable: boolean;
    request: Promise<FeatureResponse[]>;
  }[] = [];
  visibleItems.forEach((item) => {
    const layerId = item.layerId;
    if (!item.isLayer()) {
      return;
    }
    const pluginConfig = item.plugin[
      "@nextgisweb/webmap/plugin/feature-layer"
    ] as FeatureLayerWebMapPluginConfig;

    if (pluginConfig === undefined || !pluginConfig.likeSearch) return;

    const signal = controller.makeSignal();
    const request = route("feature_layer.feature.collection", layerId).get({
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
    });
    requests.push({ layerId, identifiable: item.identifiable, request });
  });

  const results = await Promise.allSettled(requests.map((r) => r.request));
  const searchResults: SearchResult[] = [];
  let isExceeded = false;
  results.forEach((r, index) => {
    if (r.status !== "fulfilled" || !r.value || limit < 1) return;
    const { layerId, identifiable } = requests[index];
    r.value.forEach((feature) => {
      if (isExceeded) return;
      const searchResult: SearchResult = {
        label: feature.label,
        geometry: geoJSON.readGeometry(feature.geom),
        type: "layers",
        key: limit,
        identifiable,
        ...(identifiable && {
          featureId: feature.id,
          resourceId: layerId,
        }),
      };
      searchResults.push(searchResult);
      limit = limit - 1;
      isExceeded = limit < 1;
    });
  });

  return [limit, searchResults, isExceeded];
};
