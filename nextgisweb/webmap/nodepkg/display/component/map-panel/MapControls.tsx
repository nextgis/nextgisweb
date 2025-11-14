import { observer } from "mobx-react-lite";
import { Suspense, lazy, useMemo } from "react";

import { useContainerWidth } from "@nextgisweb/gui/hook/useContainerWidth";
import type { MapStore } from "@nextgisweb/webmap/ol/MapStore";

import { displayURLParams } from "../../displayURLParams";

import { registry } from "./registry";

export const MapControls = observer(
    ({ mapStore, isTinyMode }: { mapStore: MapStore; isTinyMode: boolean }) => {
        const width = useContainerWidth(mapStore.targetElement);
        const isMobile = width < 500;

        const lazyControls = useMemo(() => {
            let reg = registry.queryAll();

            const urlParams = displayURLParams.values();
            const urlKeys = urlParams.controls;

            if (isTinyMode) {
                if (urlKeys) {
                    reg = reg.filter(({ key, embeddedShowMode }) => {
                        const matchToUrlKey = key
                            ? urlKeys.includes(key)
                            : false;
                        const alwaysEmbeddedShow =
                            embeddedShowMode === "always";
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
        }, [isMobile, isTinyMode]);

        return (
            <Suspense>
                {lazyControls.map(({ key, LazyControl, props }) => (
                    <LazyControl key={key} {...props} />
                ))}
            </Suspense>
        );
    }
);

MapControls.displayName = "MapControls";
