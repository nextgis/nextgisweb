import type { StyleLike } from "ol/style/Style";

import type { Style } from "@nextgisweb/sld/type/api";

export function isSldStyle(style: Style | StyleLike): style is Style {
  return typeof style === "object" && style !== null && "rules" in style;
}
