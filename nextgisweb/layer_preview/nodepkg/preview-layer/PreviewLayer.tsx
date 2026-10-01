import { useEffect, useMemo, useState } from "react";
import type { CSSProperties, ReactNode } from "react";

import { LoadingWrapper } from "@nextgisweb/gui/component";
import type { Extent } from "@nextgisweb/layer/type/api";
import { useRoute } from "@nextgisweb/pyramid/hook";
import { useRouteGet } from "@nextgisweb/pyramid/hook/useRouteGet";
import { NGWLayer, URLLayer } from "@nextgisweb/webmap/map-component";
import type { LayerType } from "@nextgisweb/webmap/map-component";
import { OpacityControl } from "@nextgisweb/webmap/map-component/control/OpacityControl";
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
  const basemap = resData?.basemap_layer;
  const isBasemapResource = Boolean(basemap);

  if (resData) {
    const interfaces = resData.resource.interfaces;
    if (interfaces.some((iface) => mvtInterfaces.includes(iface))) {
      layerType = "MVT";
    } else if (resData.raster_layer) {
      layerType = "geotiff";
    }
  }

  const { route: extentRoute } = useRoute("layer.extent", { id });
  const [extentData, setExtentData] = useState<Extent>();
  const [isExtentLoading, setIsExtentLoading] = useState(true);
  const [opacity, setOpacity] = useState(100);

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
        <OpacityControl value={opacity} onChange={setOpacity} />
        {basemap?.url ? (
          <URLLayer
            type={basemap.type}
            url={basemap.url}
            opacity={opacity}
            copyrightText={basemap.copyright_text}
            copyrightUrl={basemap.copyright_url}
            layerOptions={{ minZoom: basemap.z_min ?? undefined }}
            sourceOptions={{
              projection: `EPSG:${basemap.epsg}`,
              maxZoom: basemap.z_max ?? undefined,
            }}
          />
        ) : (
          <NGWLayer
            resourceId={id}
            layerType={layerType}
            zIndex={1}
            opacity={opacity}
          />
        )}
        {children}
      </PreviewMap>
    </div>
  );
}
