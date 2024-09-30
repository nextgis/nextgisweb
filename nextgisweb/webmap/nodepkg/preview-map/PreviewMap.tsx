import { StrictMode, useReducer } from "react";

import { Button } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { ZoomControl } from "../map-component";
import { MapComponent } from "../map-component/MapComponent";
import type { MapComponentProps } from "../map-component/MapComponent";
import { AttributionControl } from "../map-component/control/AttributionControl";
import { MapControl } from "../map-component/control/MapControl";

export function PreviewMap({
    children,
    basemap: osmProp = false,
    ...props
}: MapComponentProps) {
    const [basemap, setBasemap] = useReducer((state) => !state, osmProp);

    return (
        <StrictMode>
            <MapComponent basemap={basemap} {...props}>
                <MapControl position="top-right">
                    <Button
                        size="small"
                        type={basemap ? "primary" : "default"}
                        onClick={setBasemap}
                    >
                        {gettext("Toggle Basemap")}
                    </Button>
                </MapControl>
                <ZoomControl position="top-left" />
                <AttributionControl position="bottom-right" />
                {children}
            </MapComponent>
        </StrictMode>
    );
}
