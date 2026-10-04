import type { CSSProperties } from "react";

import type { FeatureLayerFieldCol } from "../type";

export function getColumnStyle(
  column: Pick<FeatureLayerFieldCol, "id" | "flex">,
  userDefinedWidths: Record<number, number>
): CSSProperties {
  const { id, flex } = column;
  return userDefinedWidths[id]
    ? { flex: `0 0 ${userDefinedWidths[id]}px` }
    : { flex };
}
