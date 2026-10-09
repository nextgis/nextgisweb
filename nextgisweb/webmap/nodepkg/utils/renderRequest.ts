import { routeURL } from "@nextgisweb/pyramid/api";
import type { LayerSymbols } from "@nextgisweb/webmap/compat/type";

export interface RenderStyleOptions {
  filter?: string | null;
  symbols?: LayerSymbols;
}

export function renderStyleParams(
  styleId: number | string,
  { filter, symbols }: RenderStyleOptions
): URLSearchParams {
  const params = new URLSearchParams();
  if (filter) params.set("filter[" + styleId + "]", filter);
  if (Array.isArray(symbols) && symbols.length) {
    const value = symbols.join(",");
    if (value !== "-1") {
      params.set("symbols[" + styleId + "]", value);
    }
  }
  return params;
}

export function renderTileUrl(
  styleId: number,
  {
    nd = 200,
    changeStamp,
    ...style
  }: RenderStyleOptions & { nd?: 200 | 204; changeStamp?: number } = {}
): string {
  const params = new URLSearchParams({
    resource: String(styleId),
    nd: String(nd),
  });
  for (const [key, value] of renderStyleParams(styleId, style)) {
    params.set(key, value);
  }
  if (changeStamp) {
    params.set("_refresh", String(changeStamp));
  }
  return routeURL("render.tile") + "?z={z}&x={x}&y={y}&" + params;
}
