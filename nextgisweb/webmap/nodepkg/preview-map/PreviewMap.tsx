import { StrictMode, useMemo, useReducer, useRef } from "react";

import { DEFAULT_MAX_ZOOM } from "@nextgisweb/basemap/constant";
import { convertNgwExtentToWSEN } from "@nextgisweb/gui/util/extent";

import { ToggleControl, ZoomControl } from "../map-component";
import { MapComponent } from "../map-component/MapComponent";
import type { MapComponentProps } from "../map-component/MapComponent";
import { AttributionControl } from "../map-component/control/AttributionControl";

import MapIcon from "@nextgisweb/icon/material/map/outline";

export function PreviewMap({
    children,
    basemap: basemapProp = false,
    showZoomLevel,
    mapExtent,
    initialMapExtent: initialExtent,
    ...props
}: MapComponentProps) {
    const extent = useRef(initialExtent || mapExtent);
    const [basemap, toggleBaseMap] = useReducer((state) => !state, basemapProp);

    const styleToggleBtn = useMemo(
        () => (basemap ? { color: "inherit" } : { color: "gray" }),
        [basemap]
    );

    const maxZoom =
        mapExtent && mapExtent.maxZoom !== undefined
            ? mapExtent.maxZoom
            : DEFAULT_MAX_ZOOM;

    return (
        <StrictMode>
            <MapComponent
                basemap={basemap}
                maxZoom={maxZoom}
                mapExtent={mapExtent}
                {...props}
            >
                <ZoomControl
                    extent={
                        extent.current
                            ? convertNgwExtentToWSEN(extent.current.extent)
                            : undefined
                    }
                    showZoomLevel={showZoomLevel}
                    fitOptions={{ maxZoom }}
                    position="top-left"
                />
                <ToggleControl
                    position="top-left"
                    style={styleToggleBtn}
                    status={basemap}
                    onClick={toggleBaseMap}
                >
                    <MapIcon />
                </ToggleControl>
                <AttributionControl position="bottom-right" />
                {children}
            </MapComponent>
        </StrictMode>
    );
}
