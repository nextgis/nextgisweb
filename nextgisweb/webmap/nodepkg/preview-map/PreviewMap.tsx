import { StrictMode, Suspense, lazy, useMemo, useRef, useState } from "react";

import { DEFAULT_MAX_ZOOM } from "@nextgisweb/basemap/constant";
import { convertNgwExtentToWSEN } from "@nextgisweb/gui/util/extent";

import { registry } from "../display/component/map-panel/registry";
import { ToggleControl, ZoomControl } from "../map-component";
import { MapComponent } from "../map-component/MapComponent";
import type { MapComponentProps } from "../map-component/MapComponent";

import MapIcon from "@nextgisweb/icon/material/map/outline";

export function PreviewMap({
    children,
    basemap: basemapProp = false,
    showZoomLevel,
    mapExtent,
    initialMapExtent: initialExtent,
    ...props
}: MapComponentProps) {
    const effectiveExtent = useMemo(
        () => mapExtent ?? initialExtent,
        [initialExtent, mapExtent]
    );

    const homeExtent = useRef(initialExtent || mapExtent);
    const [basemap, setBaseMap] = useState(basemapProp);

    const maxZoom =
        effectiveExtent && effectiveExtent.maxZoom !== undefined
            ? effectiveExtent.maxZoom
            : DEFAULT_MAX_ZOOM;

    const lazyControls = useMemo(() => {
        const reg = registry.queryAll().filter((c) => c.showOnPreview);

        return reg
            .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
            .map(({ component, key, props, order, position }) => ({
                key,
                LazyControl: lazy(component),
                props: { order, position, ...props },
            }));
    }, []);

    return (
        <StrictMode>
            <MapComponent
                basemap={basemap}
                maxZoom={maxZoom}
                mapExtent={effectiveExtent}
                {...props}
            >
                <ZoomControl
                    order={-1}
                    extent={
                        homeExtent.current
                            ? convertNgwExtentToWSEN(homeExtent.current.extent)
                            : undefined
                    }
                    showZoomLevel={showZoomLevel}
                    extentProjection={
                        homeExtent.current?.srs.id
                            ? `EPSG:${homeExtent.current.srs.id}`
                            : undefined
                    }
                    fitOptions={{
                        maxZoom,
                        padding: homeExtent.current?.padding,
                    }}
                    position="top-left"
                />
                <ToggleControl
                    position="top-left"
                    value={basemap}
                    onChange={setBaseMap}
                >
                    <MapIcon />
                </ToggleControl>

                {lazyControls.map(({ key, LazyControl, props }) => (
                    <Suspense key={key}>
                        <LazyControl {...props} />
                    </Suspense>
                ))}
                {children}
            </MapComponent>
        </StrictMode>
    );
}
