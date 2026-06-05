import { runInAction } from "mobx";
import { useCallback, useMemo } from "react";

import type { FilterExpressionString } from "@nextgisweb/feature-layer/feature-filter/type";
import { pruneFilterExpressionByFields } from "@nextgisweb/feature-layer/feature-filter/util/prune";
import { findNode } from "@nextgisweb/gui/util/tree";
import { cache } from "@nextgisweb/pyramid/api/cache";
import { useRoute } from "@nextgisweb/pyramid/hook";
import type { CompositeSetup } from "@nextgisweb/resource/composite/CompositeStore";
import { CompositeWidgetModal } from "@nextgisweb/resource/composite/CompositeWidgetModal";
import type { CompositeWidgetModalProps } from "@nextgisweb/resource/composite/CompositeWidgetModal";
import type { Display } from "@nextgisweb/webmap/display";
import type { TreeLayerStore } from "@nextgisweb/webmap/store/tree-store/TreeItemStore";

export function LayerResourceEditorModal({
  nodeData,
  display,
  ...restCompositeProps
}: Omit<CompositeWidgetModalProps, "setup" | "onSave"> & {
  nodeData: TreeLayerStore;
  display: Display;
}) {
  const id = nodeData.layerId;
  const webmapId = display.config.webmapId;
  const { route: routeDisplayConfig, abort: abortDisplayConfig } = useRoute(
    "webmap.display_config",
    {
      id: webmapId,
    }
  );
  const { route: routeResourceItem, abort: abortResourceItem } = useRoute(
    "resource.item",
    {
      id: nodeData.layerId,
    }
  );

  const setup = useMemo<CompositeSetup>(
    () => ({
      id,
      operation: "update",
    }),
    [id]
  );

  const onSave = useCallback(async () => {
    abortDisplayConfig();
    abortResourceItem();
    cache.clean();

    const newConfig = await routeDisplayConfig.get();
    const newItemConfig = findNode(
      newConfig.rootItem.children,
      (item) => item.type === "layer" && item.layerId === id
    );

    if (newItemConfig && newItemConfig.type === "layer") {
      const currentFilter = nodeData.filter;
      let filter: FilterExpressionString | null | undefined;

      if (currentFilter) {
        try {
          const res = await routeResourceItem.get({ cache: true });
          const newFields = res.feature_layer?.fields;

          if (newFields) {
            filter = pruneFilterExpressionByFields(currentFilter, newFields);
          }
        } catch {
          // ignore
        }
      }

      runInAction(() => {
        nodeData.load(newItemConfig);

        if (filter !== undefined) {
          nodeData.update({ filter });
        }
      });
    }
  }, [
    id,
    nodeData,
    routeResourceItem,
    routeDisplayConfig,
    abortDisplayConfig,
    abortResourceItem,
  ]);

  return (
    <CompositeWidgetModal
      setup={setup}
      onSave={onSave}
      className="ngw-webmap-layer-resource-editor-modal"
      {...restCompositeProps}
    />
  );
}
