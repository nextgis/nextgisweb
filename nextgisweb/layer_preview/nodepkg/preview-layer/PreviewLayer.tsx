import { useReducer, useState } from "react";
import type React from "react";

import { Button, Space } from "@nextgisweb/gui/antd";
import { LoadingWrapper } from "@nextgisweb/gui/component";
import { useRouteGet } from "@nextgisweb/pyramid/hook/useRouteGet";
import { gettext } from "@nextgisweb/pyramid/i18n";
import {
    Basemap,
    MapComponent,
    MapControl,
    NGWLayer,
    ZoomControl,
} from "@nextgisweb/webmap/map-component";
import type { LayerType } from "@nextgisweb/webmap/map-component";
import { AttributionControl } from "@nextgisweb/webmap/map-component/control/AttributionControl";
import type { MapAdapter } from "@nextgisweb/webmap/ol/MapAdapter";

export function PreviewLayer({
    resourceId: id,
    style,
    beforeControls,
    afterControls,
}: {
    resourceId: number;
    style?: React.CSSProperties;
    beforeControls?: React.ReactNode;
    afterControls?: React.ReactNode;
}) {
    const [basemap, toggleBaseMap] = useReducer((state) => !state, true);

    const [mapAdapter, setMapAdapter] = useState<MapAdapter | null>(null);

    let layerType;
    let url;
    let attributions;
    const { data: resData, isLoading: isResLoading } = useRouteGet(
        "resource.item",
        { id }
    );
    if (resData) {
        if (resData.basemap_layer) {
            const base = resData.basemap_layer;
            url = base.url;
            attributions = base.copyright_url
                ? `<a href="${base.copyright_url}" target="_blank">${base.copyright_text}</a>`
                : base.copyright_text;
        } else {
            const interfaces = resData?.resource.interfaces;
            if (interfaces.includes("IFeatureLayer")) {
                layerType = "geojson";
            } else if (resData.raster_layer) {
                layerType = "geotiff";
            } else {
                layerType = "xyz";
            }
        }
    }

    const { data: extentData, isLoading: isExtentLoading } = useRouteGet(
        "layer.extent",
        {
            id,
        }
    );

    const padding = [20, 20, 20, 20];

    if (isResLoading && isExtentLoading) {
        return <LoadingWrapper />;
    }
    return (
        <div style={{ position: "relative" }}>
            <MapComponent
                mapExtent={
                    extentData
                        ? {
                              extent: extentData.extent,
                              srs: { id: 4326 },
                              padding,
                          }
                        : undefined
                }
                style={{ height: "75vh", ...style }}
                whenCreated={setMapAdapter}
                basemap={basemap}
            >
                <ZoomControl position="top-left" />
                <AttributionControl position="bottom-right" />
                <MapControl position="top-right">
                    <Space.Compact size="small">
                        {beforeControls}
                        <Button
                            type={basemap ? "primary" : "default"}
                            onClick={toggleBaseMap}
                        >
                            {gettext("Toggle Basemap")}
                        </Button>
                        {extentData ? (
                            <Button
                                onClick={() => {
                                    mapAdapter?.zoomToNgwExtent(
                                        extentData.extent,
                                        { padding }
                                    );
                                }}
                            >
                                {gettext("Back to layer extent")}
                            </Button>
                        ) : null}
                        {afterControls}
                    </Space.Compact>
                </MapControl>
                {url ? (
                    <Basemap url={url} attributions={attributions} />
                ) : (
                    <NGWLayer
                        resourceId={id}
                        layerType={layerType as LayerType}
                        zIndex={1}
                    />
                )}
            </MapComponent>
        </div>
    );
}
