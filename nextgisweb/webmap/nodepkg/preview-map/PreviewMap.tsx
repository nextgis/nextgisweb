import { StrictMode, useCallback, useReducer } from "react";

import { convertNgwExtentToWSEN } from "@nextgisweb/gui/util/extent";

import { ToggleControl, ZoomControl } from "../map-component";
import { MapComponent } from "../map-component/MapComponent";
import type { MapComponentProps } from "../map-component/MapComponent";
import { AttributionControl } from "../map-component/control/AttributionControl";

import MapIcon from "@nextgisweb/icon/material/map/outline";

export function PreviewMap({
    children,
    basemap: osmProp = false,
    ...props
}: MapComponentProps) {
    const [basemap, toggleBaseMap] = useReducer((state) => !state, osmProp);

    const styleToggleBtn = useCallback(
        (status: boolean) => (status ? undefined : { color: "gray" }),
        []
    );

    return (
        <StrictMode>
            <MapComponent basemap={basemap} {...props}>
                <ZoomControl
                    extent={
                        props.mapExtent
                            ? convertNgwExtentToWSEN(props.mapExtent.extent)
                            : undefined
                    }
                    fitOptions={{ maxZoom: props.mapExtent?.maxZoom }}
                    position="top-left"
                />
                <ToggleControl
                    position="top-left"
                    style={styleToggleBtn}
                    status={!!basemap}
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
