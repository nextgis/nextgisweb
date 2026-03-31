import { ResourceFeatureFilterModalLazy } from "@nextgisweb/feature-layer/resource-feature-filter/ResourceFeatureFilterModalLazy";
import showModal from "@nextgisweb/gui/showModal";
import type { TreeLayerStore } from "@nextgisweb/webmap/store/tree-store/TreeItemStore";

export async function openLayerFilter(nodeData: TreeLayerStore) {
  return new Promise<void>((resolve) => {
    showModal(ResourceFeatureFilterModalLazy, {
      id: "resource-filter",
      resourceId: nodeData.layerId,
      value: nodeData.filter ?? undefined,
      onReady: resolve,
      onApply: (filter) => nodeData.update({ filter: filter ?? null }),
    });
  });
}
