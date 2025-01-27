import Map from "ol/Map";
import type OlMap from "ol/Map";
import View from "ol/View";
import { defaults as defaultInteractions } from "ol/interaction";
import { useCallback, useEffect, useState } from "react";

import type { Display } from "../../display";
import type { AnnotationsPopup } from "../../layer/annotations/AnnotationsPopup";

function clearOlMap(map: OlMap) {
    map.getLayers().clear();
    map.getOverlays().clear();
}

export function usePrintMap({ display }: { display: Display }) {
    const [printMap, setPrintMap] = useState<Map>();

    const redrawLayers = useCallback(() => {
        if (printMap) {
            clearOlMap(printMap);
            display.map.getLayersArray().forEach((layer) => {
                if (layer.getVisible() && layer.printingCopy) {
                    // Adding the same layer to different maps causes
                    // infinite loading, thus we need a copy.
                    printMap.addLayer(layer.printingCopy());
                }
            });

            display.map.olMap
                .getOverlays()
                .getArray()
                .forEach((overlay) => {
                    if ("annPopup" in overlay && overlay.annPopup) {
                        const annPopup = overlay.annPopup as AnnotationsPopup;
                        const clonedPopup = annPopup.cloneOlPopup(
                            annPopup.getAnnFeature()
                        );
                        printMap.addOverlay(clonedPopup);
                    }
                });
        }
    }, [display.map, printMap]);

    const buildPrintMap = useCallback(
        (container: HTMLElement): OlMap => {
            const interactions = defaultInteractions({
                doubleClickZoom: true,
                keyboard: true,
                mouseWheelZoom: true,
                shiftDragZoom: false,
            });

            const mapView = display.map.olMap.getView();
            const center = mapView.getCenter();
            const zoom = mapView.getZoom();
            const view = new View({
                center,
                zoom,
            });

            const map: OlMap = new Map({
                target: container,
                controls: [],
                interactions,
                view,
            });

            const mapLogoEl = document.getElementsByClassName("map-logo");
            if (mapLogoEl.length > 0) {
                const olViewportEl =
                    container.getElementsByClassName("ol-viewport")[0];
                const newLogoEl = mapLogoEl[0].cloneNode(true);
                olViewportEl.appendChild(newLogoEl);
            }
            setPrintMap(map);
            redrawLayers();
            return map;
        },
        [display.map, redrawLayers]
    );

    useEffect(() => {
        redrawLayers();
    }, [display.map.layers, redrawLayers]);

    return { buildPrintMap, printMap };
}
