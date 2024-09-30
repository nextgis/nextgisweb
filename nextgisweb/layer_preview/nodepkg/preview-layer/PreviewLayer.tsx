import { useEffect, useState } from "react";
import type React from "react";

import { Button, Space } from "@nextgisweb/gui/antd";
import { LoadingWrapper } from "@nextgisweb/gui/component";
import { useRouteGet } from "@nextgisweb/pyramid/hook/useRouteGet";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { MapAdapter } from "@nextgisweb/webmap/ol/MapAdapter";
import {
    Basemap,
    MapComponent,
    NGWLayer,
} from "@nextgisweb/webmap/preview-map";
import type { LayerType } from "@nextgisweb/webmap/preview-map";

export function PreviewLayer({
    resource_id: resourceId,
    style,
    previewControls,
}: {
    resource_id: number;
    style?: React.CSSProperties;
    previewControls?: React.ReactNode;
}) {
    const [osm, setToggleOsm] = useState(true);
    const [resetView, setResetView] = useState(false);
    const [adapter, setMapAdapter] = useState<MapAdapter>();

    let layerType;
    let url;
    let attributions;
    const { data: resData, isLoading: isResLoading } = useRouteGet(
        "resource.item",
        { id: resourceId }
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
            id: resourceId,
        }
    );

    useEffect(() => {
        if (resetView && extentData && adapter && adapter.map) {
            adapter.zoomToNgwExtent(extentData.extent);
            setResetView(false);
        }
    }, [adapter, resetView]);

    if (isResLoading && isExtentLoading) {
        return <LoadingWrapper />;
    }
    return (
        <div style={{ position: "relative" }}>
            <MapComponent
                mapExtent={
                    extentData
                        ? { extent: extentData.extent, srs: { id: 4326 } }
                        : undefined
                }
                style={{ height: "75vh", ...style }}
                osm={osm}
                whenCreated={(adapter_) => {
                    if (adapter_) setMapAdapter(adapter_);
                }}
            >
                <Space.Compact
                    size="small"
                    style={{
                        position: "absolute",
                        top: "1rem",
                        right: "3rem",
                        zIndex: 1000,
                    }}
                >
                    {previewControls}
                    <Button
                        type={osm ? "primary" : "default"}
                        onClick={() => setToggleOsm((osm) => !osm)}
                    >
                        {gettext("Toggle OSM")}
                    </Button>
                    {extentData ? (
                        <Button
                            onClick={() => {
                                setResetView(true);
                            }}
                        >
                            {gettext("Back to layer extent")}
                        </Button>
                    ) : null}
                </Space.Compact>
                {url ? (
                    <Basemap url={url} attributions={attributions} />
                ) : (
                    <NGWLayer
                        resourceId={resourceId}
                        layerType={layerType as LayerType}
                        zIndex={1}
                    />
                )}
            </MapComponent>
        </div>
    );
}
