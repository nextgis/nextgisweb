import { observer } from "mobx-react-lite";
import { Suspense, useMemo, useRef, useState } from "react";

import { convertNgwExtentToWSEN } from "@nextgisweb/gui/util/extent";

import { registry } from "../display/component/map-panel/registry";
import { DEFAULT_MAP_MAX_ZOOM } from "../map-adapter/constant";
import { ToggleControl, ZoomControl } from "../map-component";
import { MapComponent } from "../map-component/MapComponent";
import type { MapComponentProps } from "../map-component/MapComponent";
import { useMapContext } from "../map-component/context/useMapContext";

import MapIcon from "@nextgisweb/icon/material/map/outline";

const PreviewMapControls = observer(() => {
  const { mapStore } = useMapContext();
  const reg = registry
    .queryAll()
    .filter(
      (c) => c.showOnPreview && (c.isEnabled?.({ map: mapStore }) ?? true)
    );

  const lazyControls = reg
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    .map(({ component, key, getProps, order, position, previewPosition }) => ({
      key,
      LazyControl: component,
      props: {
        order,
        position: previewPosition ?? position,
        ...getProps?.({ map: mapStore }),
      },
    }));

  return lazyControls.map(({ key, LazyControl, props }) => (
    <Suspense key={key}>
      <LazyControl {...props} />
    </Suspense>
  ));
});

PreviewMapControls.displayName = "PreviewMapControls";

export function PreviewMap({
  children,
  basemap: basemapProp = false,
  showZoomLevel,
  mapExtent,
  initialMapExtent: initialExtent,
  ...props
}: MapComponentProps) {
  const effectiveExtent = useMemo(
    () => mapExtent ?? initialExtent,
    [initialExtent, mapExtent]
  );

  const homeExtent = useRef(initialExtent || mapExtent);
  const [basemap, setBasemap] = useState(basemapProp);

  const maxZoom =
    effectiveExtent && effectiveExtent.maxZoom !== undefined
      ? effectiveExtent.maxZoom
      : DEFAULT_MAP_MAX_ZOOM;

  return (
    <MapComponent
      basemap={basemap}
      maxZoom={maxZoom}
      mapExtent={effectiveExtent}
      {...props}
    >
      <ZoomControl
        order={-1}
        extent={
          homeExtent.current
            ? convertNgwExtentToWSEN(homeExtent.current.extent)
            : undefined
        }
        showZoomLevel={showZoomLevel}
        extentProjection={
          homeExtent.current?.srs.id
            ? `EPSG:${homeExtent.current.srs.id}`
            : undefined
        }
        fitOptions={{
          maxZoom,
          padding: homeExtent.current?.padding,
        }}
        position="top-left"
      />
      <ToggleControl position="top-left" value={basemap} onChange={setBasemap}>
        <MapIcon />
      </ToggleControl>

      <PreviewMapControls />
      {children}
    </MapComponent>
  );
}
