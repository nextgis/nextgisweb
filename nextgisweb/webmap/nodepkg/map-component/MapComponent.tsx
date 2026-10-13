import { observer } from "mobx-react-lite";
import type { ViewOptions } from "ol/View";
import type { CSSProperties, ReactNode } from "react";

import type { MapExtent } from "@nextgisweb/webmap/map-adapter";
import type { MapStore } from "@nextgisweb/webmap/ol/MapStore";

import { MapContainer } from "./MapContainer";
import { useMapAdapter } from "./hook/useMapAdapter";

export interface MapComponentProps extends ViewOptions {
  style?: CSSProperties;
  target?: string;
  basemap?: boolean;
  children?: ReactNode;
  mapStore?: MapStore;
  className?: string;
  mapExtent?: MapExtent;
  initialMapExtent?: MapExtent;
  resetView?: boolean;
  showZoomLevel?: boolean;
  allowMapModeChange?: boolean;
  whenCreated?: (mapStore: MapStore | null) => void;
}

export const MapComponent = observer(
  ({
    zoom,
    style,
    center,
    basemap,
    maxZoom,
    mapStore: mapStoreProp,
    children,
    className,
    mapExtent,
    allowMapModeChange,
    whenCreated,
    ...restViewOptions
  }: MapComponentProps) => {
    const { mapStore } = useMapAdapter({
      zoom,
      center,
      basemap,
      maxZoom,
      mapStore: mapStoreProp,
      mapExtent,
      allowMapModeChange,
      ...restViewOptions,
    });

    return (
      <MapContainer
        style={style}
        mapStore={mapStore}
        className={className}
        whenCreated={whenCreated}
      >
        {children}
      </MapContainer>
    );
  }
);

MapComponent.displayName = "MapComponent";
