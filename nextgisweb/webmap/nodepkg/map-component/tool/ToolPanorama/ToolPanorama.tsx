import { observer } from "mobx-react-lite";
import Feature from "ol/Feature";
import type OlMap from "ol/Map";
import { Point } from "ol/geom";
import { Draw } from "ol/interaction";
import type { DrawEvent } from "ol/interaction/Draw";
import { fromLonLat, toLonLat } from "ol/proj";
import { useEffect, useEffectEvent, useRef } from "react";

import { message } from "@nextgisweb/gui/antd";
import { useInjection } from "@nextgisweb/pyramid/di";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { useDisplayContext } from "@nextgisweb/webmap/display/context";
import Vector from "@nextgisweb/webmap/ol/layer/Vector";
import { panoramaInjection } from "@nextgisweb/webmap/panorama/PanoramaStore";
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
  olMap: OlMap;
  groupId: string;
}

const ToolPanorama = observer((props: ToolPanoramaProps) => {
  const { olMap, groupId, ...rest } = props;
  const { display } = useDisplayContext();
  const { map: mapStore } = display;
  const adapter = mapStore.adapter;
  const store = useInjection(panoramaInjection);
  const { provider, position } = store;
  const { heading, fov } = store.pov;
  const { isActive } = useToggleGroupItem(groupId);

  const [messageApi, contextHolder] = message.useMessage();
  const { element: checker, check } = usePanoramaAvailability(provider);

  const vectorRef = useRef<Vector | null>(null);
  const interactionRef = useRef<Draw | null>(null);
  const requestIdRef = useRef(0);

  const onDrawEnd = useEffectEvent(async (evt: DrawEvent) => {
    const geometry = evt.feature.getGeometry();
    if (!(geometry instanceof Point)) return;

    const projection = olMap.getView().getProjection();
    const [lng, lat] = toLonLat(geometry.getCoordinates(), projection);

    const requestId = ++requestIdRef.current;
    const result = await check(lat, lng);
    if (requestId !== requestIdRef.current) return;

    if (result.status === "available") {
      store.setPosition(result.position);
    } else {
      messageApi.info(result.status === "error" ? msgError : msgUnavailable);
    }
  });

  useEffect(() => {
    const { dot, camera, search } = createPanoramaStyles(
      olMap.getView().getProjection()
    );
    const vector = new Vector("panorama", {
      title: "Panorama",
      isTopLayer: true,
    });
    vector
      .getLayer()
      .setStyle((feature) =>
        feature.getGeometry() instanceof Point ? dot : camera
      );
    vectorRef.current = vector;
    mapStore.addLayer(vector, undefined, adapter);

    const interaction = new Draw({ type: "Point", style: search });
    interaction.setActive(false);
    interactionRef.current = interaction;
    olMap.addInteraction(interaction);

    interaction.on("drawend", onDrawEnd);

    return () => {
      interaction.setActive(false);
      olMap.removeInteraction(interaction);
      vector.getSource()?.clear();
      mapStore.removeLayer(vector, adapter);

      interactionRef.current = null;
      vectorRef.current = null;
    };
  }, [adapter, mapStore, olMap]);

  useEffect(() => {
    const source = vectorRef.current?.getSource();
    if (!source) return;

    source.clear();
    if (!position) return;

    const projection = olMap.getView().getProjection();
    const { lat, lng } = position;
    const coordinates = fromLonLat([lng, lat], projection);
    source.addFeatures([
      new Feature(
        createPanoramaCameraGeometry(position, { heading, fov }, projection)
      ),
      new Feature(new Point(coordinates)),
    ]);
  }, [fov, heading, olMap, position]);

  useEffect(() => {
    if (!position) return;

    const { lat, lng } = position;
    const coordinates = fromLonLat([lng, lat], display.displayProjection);
    display.map.zoomToGeom(new Point(coordinates));
  }, [display, position]);

  useEffect(() => {
    requestIdRef.current++;
    interactionRef.current?.setActive(isActive);
    if (!isActive) store.clear();
  }, [isActive, olMap, store]);

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
