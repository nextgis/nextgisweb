import { useCallback } from "react";

import { getChildrenDeep } from "@nextgisweb/gui/util/tree";
import { ComputeExtent } from "@nextgisweb/webmap/component/ComputeExtent";
import type { ComputeExtentProps } from "@nextgisweb/webmap/component/ComputeExtent";
import { useOptionalDisplayContext } from "@nextgisweb/webmap/display/context";
import type {
  WebMapItemGroupWrite,
  WebMapItemLayerWrite,
  WebMapItemRootWrite,
} from "@nextgisweb/webmap/type/api";
import { extractExtentFromArray } from "@nextgisweb/webmap/utils/extent";

import type { SettingStore } from "../SettingStore";

interface ComputeWebmapExtentProps extends Pick<ComputeExtentProps, "onDone"> {
  store: SettingStore;
}

export function ComputeWebmapExtent({
  store,
  onDone,
}: ComputeWebmapExtentProps) {
  const displayContext = useOptionalDisplayContext();

  const getLayerIds = useCallback(async () => {
    const value = await store.composite.getValue();
    if (!value?.webmap?.root_item) return [];

    const items = getChildrenDeep<
      WebMapItemGroupWrite | WebMapItemLayerWrite | WebMapItemRootWrite
    >(value.webmap.root_item);
    return items
      .filter((item) => item.item_type === "layer")
      .map((item) => item.layer_style_id);
  }, [store.composite]);

  return (
    <ComputeExtent
      getLayerIds={getLayerIds}
      getCurrentExtent={
        displayContext
          ? () => {
              const { display } = displayContext;
              return extractExtentFromArray(
                display.map.getExtent(display.lonlatProjection)
              );
            }
          : undefined
      }
      onDone={onDone}
    />
  );
}
