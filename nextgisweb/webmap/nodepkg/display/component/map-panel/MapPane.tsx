import { observer } from "mobx-react-lite";
import { fromLonLat } from "ol/proj";
import { useCallback } from "react";

import { useThemeVariables } from "@nextgisweb/gui/hook";
import { MapComponent } from "@nextgisweb/webmap/map-component";

import type { Display } from "../../Display";

import { MapControls } from "./MapControls";
import { MapHighlight } from "./MapHighlight";
import { WebmapLayers } from "./WebmapLayers";

import "./MapPane.less";

export const MapPane = observer(
    ({
        display,
        children,
    }: {
        display: Display;
        children: React.ReactNode;
    }) => {
        const themeVariables = useThemeVariables({
            "theme-color-primary": "colorPrimary",
        });

        const whenCreated = useCallback(() => {
            display.setMapReady(true);

            const urlParams = display.urlParams;

            if (
                !(
                    "zoom" in urlParams &&
                    "lon" in urlParams &&
                    "lat" in urlParams
                )
            ) {
                display.map.zoomToInitialExtent();
            } else {
                const view = display.map.olView;
                if (urlParams.lon && urlParams.lat) {
                    view.setCenter(fromLonLat([urlParams.lon, urlParams.lat]));
                }
                if (urlParams.zoom !== undefined) {
                    view.setZoom(urlParams.zoom);
                }

                if ("angle" in urlParams && urlParams.angle !== undefined) {
                    view.setRotation(urlParams.angle);
                }
            }
        }, [display]);

        return (
            <MapComponent
                className="ngw-webmap-display-map-pane"
                mapStore={display.map}
                style={themeVariables}
                whenCreated={whenCreated}
            >
                <MapControls
                    mapStore={display.map}
                    isTinyMode={display.isTinyMode}
                />
                <WebmapLayers
                    mapStore={display.map}
                    treeStore={display.treeStore}
                />
                <MapHighlight
                    mapStore={display.map}
                    highlightStore={display.highlighter}
                />
                {children}
            </MapComponent>
        );
    }
);

MapPane.displayName = "MapPane";
