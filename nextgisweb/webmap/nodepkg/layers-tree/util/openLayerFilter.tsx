import type { FeatureLayerFieldRead } from "@nextgisweb/feature-layer/type/api";
import showModal from "@nextgisweb/gui/showModal";
import { route } from "@nextgisweb/pyramid/api";
import type { TreeLayerStore } from "@nextgisweb/webmap/store/tree-store/TreeItemStore";

export async function openLayerFilter(nodeData: TreeLayerStore) {
    const itemInfo = await route("resource.item", nodeData.layerId).get();
    let layerFields: FeatureLayerFieldRead[] = [];
    if (itemInfo && itemInfo.feature_layer) {
        layerFields = itemInfo.feature_layer.fields;
    }

    const FilterModal = (
        await import("@nextgisweb/feature-layer/feature-filter/FeatureFilterModalLazy")
    ).default;

    showModal(FilterModal, {
        fields: layerFields,
        value: nodeData.filter ?? undefined,
        onApply: (filter) => nodeData.update({ filter: filter ?? null }),
    });
}
