import { observer } from "mobx-react-lite";
import { Suspense, lazy, useCallback, useMemo } from "react";
import type React from "react";

import { useThemeVariables } from "@nextgisweb/gui/hook";
import { useContainerWidth } from "@nextgisweb/gui/hook/useContainerWidth";
import { MapComponent } from "@nextgisweb/webmap/map-component";

import type { Display } from "../../Display";

import { registry } from "./registry";
import "./MapPane.less";

const MapControls = observer(({ display }: { display: Display }) => {
    const width = useContainerWidth(display.map.targetElement);
    const isMobile = width < 500;

    const lazyControls = useMemo(() => {
        let reg = registry.queryAll();

        const urlParams = display.getUrlParams();
        const urlKeys = urlParams.controls;

        if (display.isTinyMode) {
            if (urlKeys) {
                reg = reg.filter(({ key, embeddedShowMode }) => {
                    const matchToUrlKey = key ? urlKeys.includes(key) : false;
                    const alwaysEmbeddedShow = embeddedShowMode === "always";
                    return matchToUrlKey || alwaysEmbeddedShow;
                });
            } else {
                reg = reg.filter((r) => r.embeddedShowMode === "always");
            }
        }

        if (isMobile) {
            reg = reg.filter((r) => !r.hideOnMobile);
        }

        return reg
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map(({ component, key, props, order, position }) => ({
                key,
                LazyControl: lazy(component),
                props: { order, position, ...props },
            }));
    }, [display, isMobile]);

    return (
        <Suspense>
            {lazyControls.map(({ key, LazyControl, props }) => (
                <LazyControl key={key} {...props} />
            ))}
        </Suspense>
    );
});

MapControls.displayName = "MapControls";

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
        }, [display]);

        return (
            <MapComponent
                className="ngw-webmap-display-map-pane"
                mapStore={display.map}
                style={themeVariables}
                whenCreated={whenCreated}
            >
                <MapControls display={display} />
                {children}
            </MapComponent>
        );
    }
);

MapPane.displayName = "MapPane";
