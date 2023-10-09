import { toLonLat } from "ol/proj";

import AnnotationsStore from "@nextgisweb/webmap/store/annotations/";

export const getPermalink = (display, visibleItems, options) => {
    options = options ? options : {};

    const visibleStyles = visibleItems.map(
        (i) => display.itemStore.dumpItem(i).styleId
    );

    const center = options.center
        ? options.center
        : toLonLat(display.map.olMap.getView().getCenter());

    let annot;
    const annotationPanel = display.panelsManager.getPanel("annotation");
    if (display && annotationPanel) {
        annot = AnnotationsStore.visibleMode;
    }

    let params = {
        base: display._baseLayer.name,
        lon: center[0].toFixed(4),
        lat: center[1].toFixed(4),
        angle: display.map.olMap.getView().getRotation(),
        zoom: display.map.olMap.getView().getZoom(),
        styles: visibleStyles.join(","),
    };

    if (annot) {
        params = { ...params, ...{ annot } };
    }

    if (options.additionalParams) {
        params = { ...params, ...options.additionalParams };
    }

    const queryString = new URLSearchParams(params).toString();

    let urlWithoutParams;
    if (options.urlWithoutParams) {
        urlWithoutParams = options.urlWithoutParams;
    } else {
        const origin = options.origin ? options.origin : window.location.origin;
        const pathname = options.pathname
            ? options.pathname
            : window.location.pathname;
        urlWithoutParams = `${origin}${pathname}`;
    }

    return `${urlWithoutParams}?${queryString}`;
};
