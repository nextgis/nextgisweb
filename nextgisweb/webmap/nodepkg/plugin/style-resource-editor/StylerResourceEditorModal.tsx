import { runInAction } from "mobx";
import { useCallback, useMemo } from "react";

import { findNode } from "@nextgisweb/gui/util/tree";
import { cache } from "@nextgisweb/pyramid/api/cache";
import { useRoute } from "@nextgisweb/pyramid/hook";
import type { CompositeSetup } from "@nextgisweb/resource/composite/CompositeStore";
import { CompositeWidgetModal } from "@nextgisweb/resource/composite/CompositeWidgetModal";
import type { CompositeWidgetModalProps } from "@nextgisweb/resource/composite/CompositeWidgetModal";
import type { Display } from "@nextgisweb/webmap/display";
import type { TreeLayerStore } from "@nextgisweb/webmap/store/tree-store/TreeItemStore";

export function StyleResourceEditorModal({
  nodeData,
  display,
  ...restCompositeProps
}: Omit<CompositeWidgetModalProps, "setup" | "onSave"> & {
  nodeData: TreeLayerStore;
  display: Display;
}) {
  const id = nodeData.styleId;
  const webmapId = display.config.webmapId;
  const { route: routeDisplayConfig, abort: abortDisplayConfig } = useRoute(
    "webmap.display_config",
    {
      id: webmapId,
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

    cache.clean();

    const newConfig = await routeDisplayConfig.get();
    const newItemConfig = findNode(
      newConfig.rootItem.children,
      (item) => item.type === "layer" && item.styleId === id
    );

    if (newItemConfig && newItemConfig.type === "layer") {
      runInAction(() => {
        nodeData.legendInfo.setSymbols(null);
        nodeData.load(newItemConfig);
        display.treeStore.updateResourceLegendSymbols([id]);
      });
    }
  }, [id, nodeData, display, routeDisplayConfig, abortDisplayConfig]);

  return (
    <CompositeWidgetModal
      setup={setup}
      onSave={onSave}
      className="ngw-webmap-style-resource-editor-modal"
      {...restCompositeProps}
    />
  );
}
