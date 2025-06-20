import { useCallback, useEffect, useMemo, useReducer, useState } from "react";

import { LoadingWrapper } from "@nextgisweb/gui/component";
import { convertNgwExtentToWSEN } from "@nextgisweb/gui/util/extent";
import type { Extent } from "@nextgisweb/layer/type/api";
import { useRoute } from "@nextgisweb/pyramid/hook";
import { useRouteGet } from "@nextgisweb/pyramid/hook/useRouteGet";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { ResourceInterface } from "@nextgisweb/resource/type/api";
import {
    AttributionControl,
    MapComponent,
    NGWLayer,
    ToggleControl,
    UrlLayer,
    ZoomControl,
} from "@nextgisweb/webmap/map-component";

import MapIcon from "@nextgisweb/icon/material/map/outline";

const extentInterfaces: ResourceInterface[] = ["IBboxLayer"];
const mvtInterfaces: ResourceInterface[] = ["IFeatureLayer"];

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

    let layerType: "MVT" | "geotiff" | "XYZ" = "XYZ";
    let url: string | undefined;
    let attributions: string | null | undefined;

    if (resData) {
        const interfaces = resData.resource.interfaces;
        if (interfaces.some((iface) => mvtInterfaces.includes(iface))) {
            layerType = "MVT";
        } else if (resData.raster_layer) {
            layerType = "geotiff";
        }

        if (resData.basemap_layer) {
            url = resData.basemap_layer.url;
            const base = resData.basemap_layer;
            attributions = base.copyright_url
                ? `<a href="${base.copyright_url}" target="_blank">${base.copyright_text}</a>`
                : base.copyright_text;
        }
    }

    const { route: extentRoute } = useRoute("layer.extent", { id });
    const [extentData, setExtentData] = useState<Extent>();
    const [isExtentLoading, setIsExtentLoading] = useState(true);

    useEffect(() => {
        const loadExtent = async () => {
            if (resData) {
                if (
                    resData.resource.interfaces.some((iface) =>
                        extentInterfaces.includes(iface)
                    )
                ) {
                    try {
                        const data = await extentRoute.get();
                        setExtentData(data);
                    } catch {
                        // ignore
                    }
                }
                setIsExtentLoading(false);
            }
        };
        loadExtent();
    }, [extentRoute, resData]);

    const padding = useMemo(() => [20, 20, 20, 20], []);
    const mapExtent = useMemo(
        () =>
            extentData
                ? {
                      extent: extentData.extent,
                      srs: { id: 4326 },
                      padding,
                  }
                : undefined,
        [extentData, padding]
    );

    const styleToggleBtn = useCallback(
        (status: boolean) => (status ? undefined : { color: "gray" }),
        []
    );

    if (isResLoading || isExtentLoading) {
        return <LoadingWrapper />;
    }
    return (
        <div style={{ position: "relative" }}>
            <MapComponent
                mapExtent={mapExtent}
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
                    <UrlLayer url={url} attributions={attributions} />
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
