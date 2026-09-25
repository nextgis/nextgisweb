import { route } from "@nextgisweb/pyramid/api";

import type { SearchFunction, SearchResult, SearchResultGroup } from "../type";

import { getUsedLayers } from "./getUsedLayers";

interface FeatureResponse {
  id: number;
  label: string;
  geom: any;
  search_context?: number[];
}

export const searchByLayers: SearchFunction = async (
  criteria,
  limit,
  display,
  controller,
  geoJSON,
  settings
) => {
  const items = getUsedLayers(display.treeStore, settings.usedLayers);
  const requests: {
    layerName: string;
    layerId: number;
    styleId: number;
    identifiable: boolean;
    request: Promise<FeatureResponse[]>;
  }[] = [];
  items.forEach((item) => {
    if (!item.isLayer()) {
      return;
    }
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
          text_search: criteria,
          text_search_context: "fields",
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
        searchContext: feature.search_context,
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
