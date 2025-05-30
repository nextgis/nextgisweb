import Map from "ol/Map";
import type OlMap from "ol/Map";
import View from "ol/View";
import { defaults as defaultInteractions } from "ol/interaction";
import { useCallback, useEffect, useState } from "react";

import { imageQueue } from "@nextgisweb/pyramid/util";
import { mapStartup } from "@nextgisweb/webmap/ol/util/mapStartup";

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
            // Use getLayersArray() from the OL map directly because some layers may have been added directly to the OL map rather than to display.map
            display.map.getLayersArray().forEach((layer) => {
                if (layer.getVisible() && layer.printingCopy) {
                    // Adding the same layer to different maps causes
                    // infinite loading, thus we need a copy.
                    const copyLayer = layer.printingCopy();

                    const matchedLayerEntry = Object.values(
                        display.map.layers
                    ).find(
                        (entry) => entry.getLayer && entry.getLayer() === layer
                    );

                    if (matchedLayerEntry?.isBaseLayer) {
                        copyLayer.setZIndex(-1);
                    }

                    printMap.addLayer(copyLayer);
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

            // This is an important aspect not just for optimization
            // but also for handling the print map logic,
            // where after each position change, the map scale is rounded and the map view is redrawn.
            map.once("movestart", () => {
                // If the display page opens in the print panel, the main map starts loading invisibly underneath.
                // Aborting the shared image queue too early prevents the main map from loading its layers.
                // So we have to wait until it's fully loaded before using the queue for the print map.
                imageQueue.waitAll().then(() => {
                    mapStartup({ olMap: map, queue: imageQueue });
                });
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
