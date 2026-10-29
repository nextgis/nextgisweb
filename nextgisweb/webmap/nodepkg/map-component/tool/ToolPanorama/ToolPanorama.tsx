import { observer } from "mobx-react-lite";
import Feature from "ol/Feature";
import { Point } from "ol/geom";
import { circular } from "ol/geom/Polygon";
import { fromLonLat, toLonLat } from "ol/proj";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";

import { message } from "@nextgisweb/gui/antd";
import { useInjection } from "@nextgisweb/pyramid/di";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { useDisplayContext } from "@nextgisweb/webmap/display/context";
import type { GeoJsonLayerDefinition } from "@nextgisweb/webmap/layer-adapter";
import type { MapClickEvent } from "@nextgisweb/webmap/map-adapter";
import { useMapLayer } from "@nextgisweb/webmap/map-component/hook/useMapLayer";
import { panoramaInjection } from "@nextgisweb/webmap/panorama/PanoramaStore";
import { PANORAMA_SEARCH_RADIUS } from "@nextgisweb/webmap/panorama/constant";
import { usePanoramaAvailability } from "@nextgisweb/webmap/panorama/hook/usePanoramaAvailability";

import { ToggleControl } from "../../control";
import type { ToggleControlProps } from "../../control";
import { useToggleGroupItem } from "../../control/toggle-group";

import { createPanoramaCameraGeometry } from "./createPanoramaCameraGeometry";
import { createPanoramaStyles } from "./createPanoramaStyles";

import PanoramaIcon from "@nextgisweb/icon/material/panorama_photosphere";

/* prettier-ignore */ const
msgTitle = gettext("Search panorama"),
msgUnavailable = gettext("No panorama available at this location"),
msgError = gettext("The panorama service is currently unavailable. Please try again at a later time or contact Web GIS administrator.");

export interface ToolPanoramaProps extends ToggleControlProps {
  groupId: string;
}

const ToolPanorama = observer((props: ToolPanoramaProps) => {
  const { groupId, ...rest } = props;
  const { display } = useDisplayContext();
  const { map: mapStore } = display;
  const { adapter, started, displayProjection, pointer } = mapStore;
  const store = useInjection(panoramaInjection);
  const { provider, position } = store;
  const { heading, fov } = store.pov;
  const { isActive } = useToggleGroupItem(groupId);

  const [messageApi, contextHolder] = message.useMessage();
  const { element: checker, check } = usePanoramaAvailability(provider);

  const layerDefinition = useMemo<GeoJsonLayerDefinition>(
    () => ({
      type: "geojson",
      options: {
        name: "panorama",
        title: "Panorama",
        isTopLayer: true,
        featureProjection: displayProjection,
        style: createPanoramaStyles(),
      },
    }),
    [displayProjection]
  );
  const vector = useMapLayer(mapStore, layerDefinition);
  const searchLayerDefinition = useMemo<GeoJsonLayerDefinition>(
    () => ({
      ...layerDefinition,
      options: { ...layerDefinition.options, name: "panorama-search" },
    }),
    [layerDefinition]
  );
  const search = useMapLayer(
    mapStore,
    isActive ? searchLayerDefinition : undefined
  );
  const requestIdRef = useRef(0);
  const [pendingCoordinates, setPendingCoordinates] = useState<number[] | null>(
    null
  );
  const searchCoordinates =
    pendingCoordinates ?? (pointer?.dragging ? null : pointer?.coordinate);

  const onMapClick = useEffectEvent(async (event: MapClickEvent) => {
    const coordinates = adapter.getCoordinateFromPixel(event.pixel);
    if (!coordinates) return;

    const [lng, lat] = toLonLat(coordinates, displayProjection);

    const requestId = ++requestIdRef.current;
    setPendingCoordinates([...coordinates]);
    const result = await check(lat, lng);
    if (requestId !== requestIdRef.current) return;

    setPendingCoordinates(null);
    if (result.status === "available") {
      store.setPosition(result.position);
    } else {
      messageApi.info(result.status === "error" ? msgError : msgUnavailable);
    }
  });

  useEffect(() => {
    if (!search) return;

    const coordinates = searchCoordinates;
    if (!coordinates) {
      search.setFeatures([]);
      return;
    }

    search.setFeatures([
      new Feature(
        circular(
          toLonLat(coordinates, displayProjection),
          PANORAMA_SEARCH_RADIUS
        ).transform("EPSG:4326", displayProjection)
      ),
      new Feature(new Point(coordinates)),
    ]);
  }, [displayProjection, searchCoordinates, search]);

  useEffect(() => {
    if (!search) return;
    search.setOpacity(1);
    if (!pendingCoordinates) return;

    let animationFrame = 0;
    const delay = setTimeout(() => {
      const start = performance.now();
      const animate = (now: number) => {
        const pulseProgress = (now - start) / 1000;
        search.setOpacity(0.65 + 0.35 * Math.cos(pulseProgress * 2 * Math.PI));
        animationFrame = requestAnimationFrame(animate);
      };
      animationFrame = requestAnimationFrame(animate);
    }, 300);

    return () => {
      clearTimeout(delay);
      cancelAnimationFrame(animationFrame);
    };
  }, [pendingCoordinates, search]);

  useEffect(() => {
    if (!vector) return;

    if (!position) {
      vector.setFeatures([]);
      return;
    }

    const { lat, lng } = position;
    const coordinates = fromLonLat([lng, lat], displayProjection);
    vector.setFeatures([
      new Feature(
        createPanoramaCameraGeometry(
          position,
          { heading, fov },
          displayProjection
        )
      ),
      new Feature(new Point(coordinates)),
    ]);
  }, [fov, heading, displayProjection, position, vector]);

  useEffect(() => {
    if (!position) return;

    const { lat, lng } = position;
    const coordinates = fromLonLat([lng, lat], display.displayProjection);
    display.map.zoomToGeom(new Point(coordinates));
  }, [display, position]);

  useEffect(() => {
    const cancelRequests = () => {
      requestIdRef.current++;
      setPendingCoordinates(null);
    };
    cancelRequests();
    if (!isActive) store.clear();
    if (!isActive || !started) return;

    const unsubscribe = adapter.subscribeClick(onMapClick);
    return () => {
      cancelRequests();
      unsubscribe();
    };
  }, [adapter, isActive, started, provider, store]);

  return (
    <>
      {contextHolder}
      <ToggleControl {...rest} groupId={groupId} title={msgTitle}>
        <PanoramaIcon />
      </ToggleControl>
      {isActive && checker}
    </>
  );
});

ToolPanorama.displayName = "ToolPanorama";
export default ToolPanorama;
