import type { Coordinate } from "ol/coordinate";
import { toLonLat } from "ol/proj";

import type { Display } from "../display";
import type { TreeItemStore } from "../store/tree-store/TreeItemStore";
import type { DisplayURLParams } from "../type";
import type { AnnotationVisibleMode } from "../ui/annotations-manager";

export interface GetPermalinkOptions {
  display: Display;
  visibleItems: TreeItemStore[];
  visibleMode?: AnnotationVisibleMode | null;
  center?: Coordinate;
  additionalParams?: Record<string, string | number | boolean | string[]>;
  urlWithoutParams?: string;
  origin?: string;
  pathname?: string;
}

export const getPermalink = ({
  display,
  visibleItems,
  visibleMode,
  center,
  additionalParams,
  urlWithoutParams,
  origin,
  pathname,
}: GetPermalinkOptions): string => {
  // { 1: ['0-5', '8-12'], 2: [], 3: '-1' } >>> 1[0-5|8-12],2,3[-1]
  const visibleStyles: string[] = [];
  visibleItems.forEach((item) => {
    if ("styleId" in item) {
      let styleStr = String(item.styleId);
      if (item.symbols && item.symbols.length) {
        styleStr += `[${Array.isArray(item.symbols) ? item.symbols.join("|") : item.symbols}]`;
      }
      visibleStyles.push(styleStr);
    }
  });

  const params: Partial<Record<keyof DisplayURLParams, string>> = {
    angle: display.map.rotation.toFixed(3),
    zoom: (display.map.zoom ?? 0).toFixed(3),
    styles: visibleStyles.join(","),
    ...(display.mapMode === "2d" ? {} : { mode: display.mapMode }),
    ...additionalParams,
  };
  if (display.map.activeBasemapKey) {
    params.base = display.map.activeBasemapKey;
  }

  if (center === undefined) {
    const coord = display.map.center;
    if (coord) {
      center = toLonLat(coord, display.map.displayProjection);
    }
  }
  if (center) {
    params["lon"] = center[0].toFixed(4);
    params["lat"] = center[1].toFixed(4);
  }

  let annot: AnnotationVisibleMode | undefined | null = null;
  const annotationPanel = display.panelManager.getPanel("annotation");
  if (display && annotationPanel) {
    annot = visibleMode ?? display.annotationsManager.visibleMode;
  }

  if (annot) {
    params["annot"] = annot;
  }

  const queryString = new URLSearchParams(params).toString();

  if (!urlWithoutParams) {
    origin = origin ? origin : window.location.origin;
    pathname = pathname ? pathname : window.location.pathname;
    urlWithoutParams = `${origin}${pathname}`;
  }

  return `${urlWithoutParams}?${queryString}`;
};
