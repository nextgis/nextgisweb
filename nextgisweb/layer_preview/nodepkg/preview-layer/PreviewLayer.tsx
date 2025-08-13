import { useEffect, useMemo, useState } from "react";

import { LoadingWrapper } from "@nextgisweb/gui/component";
import type { Extent } from "@nextgisweb/layer/type/api";
import { useRoute } from "@nextgisweb/pyramid/hook";
import { useRouteGet } from "@nextgisweb/pyramid/hook/useRouteGet";
import { NGWLayer, URLLayer } from "@nextgisweb/webmap/map-component";
import { PreviewMap } from "@nextgisweb/webmap/preview-map";

import { extentInterfaces, mvtInterfaces } from "../constant";

export function PreviewLayer({
    style,
    children,
    resourceId: id,
}: {
    style?: React.CSSProperties;
    children?: React.ReactNode;
    resourceId: number;
}) {
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

    if (isResLoading || isExtentLoading) {
        return <LoadingWrapper />;
    }
    return (
        <div style={{ position: "relative" }}>
            <PreviewMap
                mapExtent={mapExtent}
                style={{ height: "75vh", ...style }}
                basemap
            >
                {url ? (
                    <URLLayer url={url} attributions={attributions} />
                ) : (
                    <NGWLayer
                        resourceId={id}
                        layerType={layerType}
                        zIndex={1}
                    />
                )}
                {children}
            </PreviewMap>
        </div>
    );
}
