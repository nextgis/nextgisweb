import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import type { QMSService } from "@nextgisweb/basemap/layer-widget/type";
import { LoadingWrapper } from "@nextgisweb/gui/component";
import type { Extent } from "@nextgisweb/layer/type/api";
import { useRoute } from "@nextgisweb/pyramid/hook";
import { useRouteGet } from "@nextgisweb/pyramid/hook/useRouteGet";
import { NGWLayer, URLLayer } from "@nextgisweb/webmap/map-component";
import type { LayerType } from "@nextgisweb/webmap/map-component";
import { PreviewMap } from "@nextgisweb/webmap/preview-map";

import { extentInterfaces, mvtInterfaces } from "../constant";

export function PreviewLayer({
  style,
  children,
  resourceId: id,
}: {
  style?: CSSProperties;
  children?: ReactNode;
  resourceId: number;
}) {
  const { data: resData, isLoading: isResLoading } = useRouteGet(
    "resource.item",
    { id }
  );

  let layerType: LayerType = "image";
  let url: string | undefined;
  let copyrightText: string | null | undefined;
  let copyrightUrl: string | null | undefined;
  const isBasemapResource = Boolean(resData?.basemap_layer);

  if (resData) {
    const interfaces = resData.resource.interfaces;
    if (interfaces.some((iface) => mvtInterfaces.includes(iface))) {
      layerType = "MVT";
    } else if (resData.raster_layer) {
      layerType = "geotiff";
    }

    if (resData.basemap_layer) {
      url = resData.basemap_layer.url;

      if (url && "qms" in resData.basemap_layer && resData.basemap_layer.qms) {
        try {
          const qms = JSON.parse(resData.basemap_layer.qms) as QMSService;
          if (!qms.y_origin_top) {
            url = url.replace("{y}", "{-y}");
          }
        } catch {
          //
        }
      }

      const base = resData.basemap_layer;
      copyrightText = base.copyright_text;
      copyrightUrl = base.copyright_url;
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
        basemap={!isBasemapResource}
      >
        {url ? (
          <URLLayer
            url={url}
            copyrightText={copyrightText}
            copyrightUrl={copyrightUrl}
          />
        ) : (
          <NGWLayer resourceId={id} layerType={layerType} zIndex={1} />
        )}
        {children}
      </PreviewMap>
    </div>
  );
}
