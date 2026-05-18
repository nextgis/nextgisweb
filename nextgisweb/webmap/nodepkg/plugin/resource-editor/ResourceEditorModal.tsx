import { runInAction } from "mobx";
import { Suspense, lazy, useCallback, useEffect, useMemo } from "react";

import type { FilterExpressionString } from "@nextgisweb/feature-layer/feature-filter/type";
import { pruneFilterExpressionByFields } from "@nextgisweb/feature-layer/feature-filter/util/prune";
import type { ModalProps } from "@nextgisweb/gui/antd";
import { EditorModal } from "@nextgisweb/gui/editor-modal/EditorModal";
import { findNode } from "@nextgisweb/gui/util/tree";
import { cache } from "@nextgisweb/pyramid/api/cache";
import { useRoute } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { CompositeSetup } from "@nextgisweb/resource/composite/CompositeStore";
import type { Display } from "@nextgisweb/webmap/display";
import type { TreeLayerStore } from "@nextgisweb/webmap/store/tree-store/TreeItemStore";

const CompositeWidgetLazy = lazy(
  () => import("@nextgisweb/resource/composite")
);

export function ResourceEditorModal({
  nodeData,
  display,
  open,
  close,
  onCancel,
  afterClose,
}: Pick<ModalProps, "open" | "onCancel" | "afterClose"> & {
  nodeData: TreeLayerStore;
  display: Display;
  close?: () => void;
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

  const handleClose = useCallback(() => {
    close?.();
  }, [close]);

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

    handleClose();
  }, [
    id,
    nodeData,
    routeResourceItem,
    routeDisplayConfig,
    abortDisplayConfig,
    abortResourceItem,
    handleClose,
  ]);

  useEffect(() => {
    return () => {
      abortDisplayConfig();
    };
  }, [abortDisplayConfig]);

  return (
    <EditorModal
      open={open ?? true}
      onCancel={onCancel}
      afterClose={afterClose}
      closable={false}
      modalClassName="ngw-webmap-editor-modal"
    >
      <Suspense>
        <CompositeWidgetLazy
          setup={setup}
          onSave={onSave}
          unsavedChanges={false}
          rightActions={[
            {
              action: handleClose,
              title: gettext("Cancel"),
            },
          ]}
        />
      </Suspense>
    </EditorModal>
  );
}
