import type { Coordinate } from "ol/coordinate";
import { toLonLat } from "ol/proj";

import type { StoreItem } from "../compat/CustomItemFileWriteStore";
import type { Display } from "../display";
import type { AnnotationVisibleMode } from "../store/annotations/AnnotationsStore";
import type { DisplayURLParams } from "../type";

export interface GetPermalinkOptions {
    display: Display;
    visibleItems: StoreItem[];
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
    visibleItems.forEach((i) => {
        const item = display.itemStore.dumpItem(i);
        if ("styleId" in item) {
            let styleStr = String(item.styleId);
            if (item.symbols && item.symbols.length) {
                styleStr += `[${Array.isArray(item.symbols) ? item.symbols.join("|") : item.symbols}]`;
            }
            visibleStyles.push(styleStr);
        }
    });

    const params: Partial<Record<keyof DisplayURLParams, string>> = {
        angle: String(display.map.olMap.getView().getRotation() || 0),
        zoom: String(display.map.olMap.getView().getZoom() || 0),
        styles: visibleStyles.join(","),
        ...additionalParams,
    };
    if (display.map.baseLayer) {
        params.base = display.map.baseLayer.name;
    }

    if (center === undefined) {
        const coord = display.map.olMap.getView().getCenter();
        if (coord) {
            center = toLonLat(coord);
        }
    }
    if (center) {
        params["lon"] = center[0].toFixed(4);
        params["lat"] = center[1].toFixed(4);
    }

    let annot: AnnotationVisibleMode | undefined | null = null;
    const annotationPanel = display.panelManager.getPanel("annotation");
    if (display && annotationPanel) {
        annot = visibleMode;
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
