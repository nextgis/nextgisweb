import { useCallback } from "react";

import type { Display } from "@nextgisweb/webmap/display";
import { extractExtentFromArray } from "@nextgisweb/webmap/utils/extent";

import { ComputeExtent } from "./ComputeExtent";
import type { ComputeExtentProps } from "./ComputeExtent";

interface ComputeMapExtentProps extends Pick<ComputeExtentProps, "onDone"> {
  display: Display;
}

export function ComputeMapExtent({ display, onDone }: ComputeMapExtentProps) {
  const getLayerIds = useCallback(
    async () =>
      display.treeStore.filter({ type: "layer" }).map((item) => item.styleId),
    [display]
  );

  const getCurrentExtent = useCallback(
    () =>
      extractExtentFromArray(display.map.getExtent(display.lonlatProjection)),
    [display]
  );

  return (
    <ComputeExtent
      getLayerIds={getLayerIds}
      getCurrentExtent={getCurrentExtent}
      onDone={onDone}
    />
  );
}
