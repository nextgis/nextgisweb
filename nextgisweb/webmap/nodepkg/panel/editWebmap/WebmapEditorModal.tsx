import { reaction } from "mobx";
import { useCallback, useEffect, useMemo } from "react";

import { cache } from "@nextgisweb/pyramid/api/cache";
import { useRoute } from "@nextgisweb/pyramid/hook";
import { CompositeStore } from "@nextgisweb/resource/composite/CompositeStore";
import type { CompositeSetup } from "@nextgisweb/resource/composite/CompositeStore";
import { CompositeWidgetModal } from "@nextgisweb/resource/composite/CompositeWidgetModal";
import type { CompositeWidgetModalProps } from "@nextgisweb/resource/composite/CompositeWidgetModal";
import type { Display } from "@nextgisweb/webmap/display";
import { ItemsStore } from "@nextgisweb/webmap/items-widget/ItemsStore";
import type { WebMapRead } from "@nextgisweb/webmap/type/api";
import { getWebmapTree } from "@nextgisweb/webmap/utils/webmap-item-utils";

type ItemsStoreValue = Pick<WebMapRead, "root_item" | "draw_order_enabled">;

export function WebmapEditorModal({
  display,
  ...restCompositeProps
}: Omit<CompositeWidgetModalProps, "setup" | "store" | "onSave"> & {
  display: Display;
}) {
  const webmapId = display.config.webmapId;
  const { route: routeDisplayConfig, abort: abortDisplayConfig } = useRoute(
    "webmap.display_config",
    {
      id: webmapId,
    }
  );

  const setup = useMemo<CompositeSetup>(
    () => ({
      id: webmapId,
      operation: "update",
    }),
    [webmapId]
  );

  const composite = useMemo(() => new CompositeStore({ setup }), [setup]);

  const itemsValue = useMemo<ItemsStoreValue | undefined>(() => {
    const { treeStore } = display;
    return treeStore.dirty
      ? {
          draw_order_enabled: treeStore.drawOrderEnabled,
          root_item: {
            item_type: "root",
            children: getWebmapTree(treeStore),
          },
        }
      : undefined;
  }, [display]);

  useEffect(() => {
    if (itemsValue === undefined) return;

    return reaction(
      () => composite.loading,
      (loading) => {
        if (loading) return;

        const itemsStore = composite.members
          ?.map(({ store }) => store)
          .find((store) => store instanceof ItemsStore);
        if (itemsStore) {
          itemsStore.load(itemsValue);
        }
      },
      { fireImmediately: true }
    );
  }, [composite, itemsValue]);

  const onSave = useCallback(async () => {
    abortDisplayConfig();
    cache.clean();
    const newConfig = await routeDisplayConfig.get();
    display.config.update(newConfig);
  }, [abortDisplayConfig, display.config, routeDisplayConfig]);

  return (
    <CompositeWidgetModal
      setup={setup}
      store={composite}
      onSave={onSave}
      className="ngw-webmap-editor-modal"
      {...restCompositeProps}
    />
  );
}
