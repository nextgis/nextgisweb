import { StrictMode, useMemo, useReducer, useRef } from "react";

import { convertNgwExtentToWSEN } from "@nextgisweb/gui/util/extent";

import { ToggleControl, ZoomControl } from "../map-component";
import { MapComponent } from "../map-component/MapComponent";
import type { MapComponentProps } from "../map-component/MapComponent";
import { AttributionControl } from "../map-component/control/AttributionControl";

import MapIcon from "@nextgisweb/icon/material/map/outline";

export function PreviewMap({
    children,
    basemap: basemapProp = false,
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
        mapExtent && mapExtent.maxZoom !== undefined ? mapExtent.maxZoom : 18;

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
                    fitOptions={{
                        maxZoom,
                    }}
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
