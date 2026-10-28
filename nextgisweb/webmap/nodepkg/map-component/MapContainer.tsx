import { observer } from "mobx-react-lite";
import { useEffect, useEffectEvent, useMemo, useRef } from "react";
import type { CSSProperties, ReactNode } from "react";

import type { MapStore } from "@nextgisweb/webmap/ol/MapStore";

import { MapContext } from "./context/useMapContext";
import { ToggleGroup } from "./control/toggle-group/ToggleGroup";

import "ol/ol.css";
import "./MapComponent.less";

export interface MapContainerProps {
  style?: CSSProperties;
  mapStore: MapStore;
  children?: ReactNode;
  className?: string;
  whenCreated?: (mapStore: MapStore) => void;
  onError?: (error: unknown) => void;
}

export const MapContainer = observer(
  ({
    style,
    children,
    mapStore,
    className,
    whenCreated,
    onError,
  }: MapContainerProps) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const controlsRef = useRef<HTMLDivElement>(null);
    const contextValue = useMemo(() => ({ mapStore }), [mapStore]);
    const handleCreated = useEffectEvent(() => {
      whenCreated?.(mapStore);
    });
    const handleError = useEffectEvent((error: unknown) => {
      if (onError) {
        onError(error);
      } else {
        console.error(error);
      }
    });

    useEffect(() => {
      const target = controlsRef.current;
      if (!target) return;
      const controlContainer = mapStore.getControlContainer();
      target.append(controlContainer);
      return () => {
        controlContainer.remove();
      };
    }, [mapStore]);

    useEffect(() => {
      const target = mapContainerRef.current;
      if (!target) return;
      const observer = new ResizeObserver(() => {
        if (mapStore.started) {
          mapStore.updateSize();
        }
      });
      observer.observe(target);
      mapStore.startup(target, {
        onCreated: () => handleCreated(),
        onError: (error) => handleError(error),
      });

      return () => {
        observer.disconnect();
        mapStore.detach();
      };
    }, [mapStore]);

    const { mapState, defaultMapState, setMapState, setDefaultMapState } =
      mapStore;

    return (
      <ToggleGroup
        value={mapState}
        defaultValue={defaultMapState}
        onDefaultChange={setDefaultMapState}
        onChange={setMapState}
      >
        <MapContext value={contextValue}>
          <div
            className={["ngw-webmap-map-container", className]
              .filter(Boolean)
              .join(" ")}
            style={style}
          >
            <div className="map-renderer" ref={mapContainerRef} />
            <div ref={controlsRef} />
            {children}
          </div>
        </MapContext>
      </ToggleGroup>
    );
  }
);

MapContainer.displayName = "MapContainer";
