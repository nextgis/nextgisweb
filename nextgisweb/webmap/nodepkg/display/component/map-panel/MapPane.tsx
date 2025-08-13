import { observer } from "mobx-react-lite";
import { Suspense, lazy, useCallback, useMemo } from "react";

import { useThemeVariables } from "@nextgisweb/gui/hook";
import { MapComponent } from "@nextgisweb/webmap/map-component";

import type { Display } from "../../Display";

import { registry } from "./registry";
import "./MapPane.less";

function MapPaneComponent({ display }: { display: Display }) {
    const themeVariables = useThemeVariables({
        "theme-color-primary": "colorPrimary",
    });

    const whenCreated = useCallback(() => {
        display.setMapReady(true);
    }, [display]);

    const lazyControls = useMemo(
        () =>
            Array.from(registry.queryAll())
                .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                .map(({ component, key, props }) => ({
                    key,
                    LazyControl: lazy(component),
                    props,
                })),
        []
    );

    return (
        <MapComponent
            className="ngw-webmap-display-map-pane"
            mapStore={display.map}
            style={themeVariables}
            basemap={false}
            whenCreated={whenCreated}
        >
            {lazyControls.map(({ key, LazyControl, props }) => (
                <Suspense key={key} fallback={null}>
                    <LazyControl {...props} />
                </Suspense>
            ))}
        </MapComponent>
    );
}

export const MapPane = observer(MapPaneComponent);

MapPane.displayName = "MapPane";
