import { useCallback, useMemo, useReducer } from "react";

import { LoadingWrapper } from "@nextgisweb/gui/component";
import { convertNgwExtentToWSEN } from "@nextgisweb/gui/util/extent";
import { useRouteGet } from "@nextgisweb/pyramid/hook/useRouteGet";
import { gettext } from "@nextgisweb/pyramid/i18n";
import {
    AttributionControl,
    Basemap,
    MapComponent,
    NGWLayer,
    ToggleControl,
    ZoomControl,
} from "@nextgisweb/webmap/map-component";

import MapIcon from "@nextgisweb/icon/material/map/outline";

export function PreviewLayer({
    style,
    children,
    resourceId: id,
}: {
    style?: React.CSSProperties;
    children?: React.ReactNode;
    resourceId: number;
}) {
    const [basemap, toggleBaseMap] = useReducer((state) => !state, true);

    const { data: resData, isLoading: isResLoading } = useRouteGet(
        "resource.item",
        { id }
    );

    const layerType = useMemo(() => {
        if (resData) {
            const interfaces = resData?.resource.interfaces;
            if (interfaces.includes("IFeatureLayer")) {
                return "MVT";
            } else if (resData.raster_layer) {
                return "geotiff";
            }
        }
        return "XYZ";
    }, [resData]);

    const url = useMemo(() => {
        if (resData?.basemap_layer) {
            const base = resData.basemap_layer;
            return base.url;
        }
    }, [resData]);

    const attributions = useMemo(() => {
        if (resData?.basemap_layer) {
            const base = resData.basemap_layer;
            return base.copyright_url
                ? `<a href="${base.copyright_url}" target="_blank">${base.copyright_text}</a>`
                : base.copyright_text;
        }
    }, [resData]);

    const { data: extentData, isLoading: isExtentLoading } = useRouteGet(
        "layer.extent",
        { id }
    );

    const padding = [20, 20, 20, 20];

    const styleToggleBtn = useCallback(
        (status: boolean) => (status ? undefined : { color: "gray" }),
        []
    );

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
                basemap={basemap}
            >
                <ZoomControl
                    position="top-left"
                    extent={
                        extentData && convertNgwExtentToWSEN(extentData.extent)
                    }
                    fitOptions={{ padding }}
                />
                <AttributionControl position="bottom-right" />
                <ToggleControl
                    position="top-left"
                    style={styleToggleBtn}
                    status={!!basemap}
                    onClick={toggleBaseMap}
                    title={gettext("Toggle basemap")}
                >
                    <MapIcon />
                </ToggleControl>

                {url ? (
                    <Basemap url={url} attributions={attributions} />
                ) : (
                    <NGWLayer
                        resourceId={id}
                        layerType={layerType}
                        zIndex={1}
                    />
                )}
                {children}
            </MapComponent>
        </div>
    );
}
