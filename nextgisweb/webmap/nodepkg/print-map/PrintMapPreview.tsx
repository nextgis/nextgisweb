import { debounce } from "lodash-es";
import { observer } from "mobx-react-lite";
import { View } from "ol";
import type { Map as OlMap } from "ol";
import { unByKey } from "ol/Observable";
import { useCallback, useEffect, useState } from "react";

import CompanyLogoControl from "@nextgisweb/pyramid/company-logo/CompanyLogoControl";
import { useDebounce } from "@nextgisweb/pyramid/hook";
import { imageQueue } from "@nextgisweb/pyramid/util";
import { mapStartup } from "@nextgisweb/webmap/ol/util/mapStartup";

import type { Display } from "../display";
import { WebmapLayers } from "../display/component/map-panel/WebmapLayers";
import type { AnnotationsPopup } from "../layer/annotations/AnnotationsPopup";
import { MapComponent } from "../map-component";
import RotateControl from "../map-component/control/RotateControl";
import { GraticuleLayer } from "../map-component/layer/GraticuleLayer";
import { MapStore } from "../ol/MapStore";

import { PrintScaleToolbar } from "./PrintScaleToolar";
import type { PrintMapStore } from "./store";

function clearOlMap(olMap: OlMap) {
    olMap.getLayers().clear();
    olMap.getOverlays().clear();
}

export interface PrintMapPreviewProps {
    style?: React.CSSProperties;
    display: Display;
    className?: string;
    printMapStore: PrintMapStore;
}

export const PrintMapPreview = observer(
    ({ display, printMapStore }: PrintMapPreviewProps) => {
        const [mapStore] = useState(() => {
            const viewMainMap = display.map.olView;
            const projection = display.map.olView.getProjection();
            const view = new View({
                projection,
                constrainResolution: false,
                center: printMapStore.center ?? viewMainMap.getCenter(),
            });
            return new MapStore({
                view,
                controls: [],
            });
        });

        const {
            arrow,
            scale,
            width,
            height,
            margin,
            graticule,
            scaleLine,
            scaleValue,
        } = printMapStore;

        useEffect(
            function redrawLayers() {
                const printMap = mapStore.olMap;
                if (!printMap) return;

                clearOlMap(printMap);

                // TODO: Create an independent baselayer for the print map from the display config,
                // not by cloning it from the main map (WebmapLayers), because the main map may not be exist.
                display.map.getLayersArray().forEach((layer) => {
                    if (layer.getVisible() && layer.printingCopy) {
                        const matchedLayerEntry = Object.values(
                            display.map.layers
                        ).find(
                            (entry) =>
                                entry.getLayer &&
                                entry.getLayer() === layer &&
                                entry.isBaseLayer
                        );
                        if (matchedLayerEntry) {
                            const copyLayer = layer.printingCopy();
                            copyLayer.setZIndex(-1);
                            printMap.addLayer(copyLayer);
                        }
                    }
                });

                display.map.olMap
                    .getOverlays()
                    .getArray()
                    .forEach((overlay) => {
                        if ("annPopup" in overlay && overlay.annPopup) {
                            const annPopup =
                                overlay.annPopup as AnnotationsPopup;
                            const clonedPopup = annPopup.cloneOlPopup(
                                annPopup.getAnnFeature()
                            );
                            printMap.addOverlay(clonedPopup);
                        }
                    });
            },
            [display.map, display.map.layers, mapStore]
        );

        useEffect(() => {
            // This is an important aspect not just for optimization
            // but also for handling the print map logic,
            // where after each position change, the map scale is rounded and the map view is redrawn.
            display.map.olMap.once("rendercomplete", () => {
                // If the display page opens in the print panel, the main map starts loading invisibly underneath.
                // Aborting the shared image queue too early prevents the main map from loading its layers.
                // So we have to wait until it's fully loaded before using the queue for the print map.
                imageQueue.waitAll().then(() => {
                    mapStartup({ olMap: mapStore.olMap, queue: imageQueue });
                });
            });
        }, [display.map.olMap, mapStore.olMap]);

        useEffect(() => {
            if (!mapStore.ready) return;

            const viewPrintMap = mapStore.olView;

            const center = printMapStore.center;
            if (center) {
                viewPrintMap.setCenter(center);
            }

            const mainResolution =
                printMapStore.scale &&
                mapStore.resolutionForScale(printMapStore.scale);
            if (mainResolution !== undefined) {
                viewPrintMap.setResolution(mainResolution);
            }

            const fireChangeCenter = () => {
                const centerPrintMap = viewPrintMap.getCenter();
                if (centerPrintMap) {
                    printMapStore.update({ center: centerPrintMap });
                }
            };
            const viewCenterChange = debounce(fireChangeCenter, 100);
            const unCenterKey = viewPrintMap.on(
                "change:center",
                viewCenterChange
            );
            fireChangeCenter();

            return () => {
                unByKey(unCenterKey);
            };
        }, [mapStore, mapStore.ready, mapStore.olView, printMapStore]);

        useEffect(() => {
            if (scale) {
                mapStore.olView.setResolution(
                    mapStore.resolutionForScale(scale)
                );
            }
        }, [mapStore, mapStore.olView, scale]);

        const onChangeScale = useCallback(
            (scale: number) => {
                printMapStore.update({ scale });
            },
            [printMapStore]
        );
        const debouncedOnScaleChange = useDebounce(onChangeScale, 200);
        useEffect(() => {
            if (mapStore.scale !== undefined) {
                debouncedOnScaleChange(mapStore.scale);
            }
        }, [mapStore.scale, debouncedOnScaleChange]);

        useEffect(() => {
            const printMap = mapStore.olMap;
            if (!printMap) return;

            printMap.updateSize();
        }, [width, height, margin, mapStore]);

        return (
            <MapComponent
                style={{ width: "100%", height: "100%" }}
                mapStore={mapStore}
            >
                <WebmapLayers
                    mapStore={mapStore}
                    treeStore={display.treeStore}
                />
                <CompanyLogoControl position="bottom-right" />
                {arrow && (
                    <RotateControl
                        autoHide={false}
                        position="top-right"
                        style={{ borderRadius: "50px" }}
                    />
                )}
                {graticule && <GraticuleLayer showLabels />}
                <PrintScaleToolbar
                    scaleLine={scaleLine}
                    scaleValue={scaleValue}
                />
            </MapComponent>
        );
    }
);

PrintMapPreview.displayName = "PrintMapPreview";
