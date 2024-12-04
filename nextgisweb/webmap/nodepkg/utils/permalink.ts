import type { Coordinate } from "ol/coordinate";
import { toLonLat } from "ol/proj";

import type { StoreItem } from "../compat/CustomItemFileWriteStore";
import type { VisibleMode } from "../store/annotations/AnnotationsStore";
import type { DojoDisplay } from "../type";

export interface GetPermalinkOptions {
    display: DojoDisplay;
    visibleItems: StoreItem[];
    visibleMode?: VisibleMode | null;
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
    const visibleStyles: number[] = [];
    visibleItems.forEach((i) => {
        const item = display.itemStore.dumpItem(i);
        if ("styleId" in item) {
            visibleStyles.push(item.styleId);
        }
    });

    const params: Record<string, string> = {
        base: display._baseLayer.name,
        angle: String(display.map.olMap.getView().getRotation() || 0),
        zoom: String(display.map.olMap.getView().getZoom() || 0),
        styles: visibleStyles.join(","),
        ...additionalParams,
    };

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

    let annot: VisibleMode | undefined | null = null;
    const annotationPanel = display.panelsManager.getPanel("annotation");
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
