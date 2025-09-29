import { StrictMode, useRef, useState } from "react";

import { DEFAULT_MAX_ZOOM } from "@nextgisweb/basemap/constant";
import { convertNgwExtentToWSEN } from "@nextgisweb/gui/util/extent";

import { ToggleControl, ZoomControl } from "../map-component";
import { MapComponent } from "../map-component/MapComponent";
import type { MapComponentProps } from "../map-component/MapComponent";
import AttributionControl from "../map-component/control/AttributionControl";

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
    const [basemap, setBaseMap] = useState(basemapProp);

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
                    value={basemap}
                    onChange={setBaseMap}
                >
                    <MapIcon />
                </ToggleControl>
                <AttributionControl position="bottom-right" />
                {children}
            </MapComponent>
        </StrictMode>
    );
}
