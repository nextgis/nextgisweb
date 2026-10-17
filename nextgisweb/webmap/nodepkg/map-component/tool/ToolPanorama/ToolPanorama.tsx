import { observer } from "mobx-react-lite";
import Feature from "ol/Feature";
import { Point } from "ol/geom";
import { Draw } from "ol/interaction";
import type { DrawEvent } from "ol/interaction/Draw";
import { fromLonLat, toLonLat } from "ol/proj";
import { useCallback, useEffect, useRef, useState } from "react";

import { message } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { useDisplayContext } from "@nextgisweb/webmap/display/context";
import Vector from "@nextgisweb/webmap/ol/layer/Vector";
import { usePanoramaAvailability } from "@nextgisweb/webmap/panorama/hook/usePanoramaAvailability";

import { useMapContext } from "../../context/useMapContext";
import { ToggleControl } from "../../control";
import type { ToggleControlProps } from "../../control";

import { createPanoramaStyles } from "./createPanoramaStyles";

import PanoramaIcon from "@nextgisweb/icon/material/panorama_photosphere";

/* prettier-ignore */ const
msgTitle = gettext("Search panorama"),
msgUnavailable = gettext("No panorama available at this location"),
msgError = gettext("The panorama service is currently unavailable. Please try again at a later time or contact Web GIS administrator.");

export interface ToolPanoramaProps extends ToggleControlProps {
  groupId: string;
}

const ToolPanorama = observer(({ groupId, ...rest }: ToolPanoramaProps) => {
  const { mapStore } = useMapContext();
  const { display } = useDisplayContext();
  const { olMap } = mapStore;
  const store = display.panorama;
  const { position, provider } = store;

  const [messageApi, contextHolder] = message.useMessage();
  const { element: checker, check } = usePanoramaAvailability(provider);

  const vectorRef = useRef<Vector | null>(null);
  const interactionRef = useRef<Draw | null>(null);
  const requestIdRef = useRef(0);
  const [active, setActive] = useState(false);

  const onDrawEndRef = useRef<(evt: DrawEvent) => void>(null);
  onDrawEndRef.current = async (evt: DrawEvent) => {
    const geometry = evt.feature.getGeometry();
    if (!(geometry instanceof Point)) return;

    const projection = olMap.getView().getProjection();
    const [lng, lat] = toLonLat(geometry.getCoordinates(), projection);

    const requestId = ++requestIdRef.current;
    const result = await check(lat, lng);
    if (requestId !== requestIdRef.current) return;

    if (result.status === "available") {
      store.open(result.position.lat, result.position.lng);
    } else {
      messageApi.info(result.status === "error" ? msgError : msgUnavailable);
    }
  };

  useEffect(() => {
    const { dot, search } = createPanoramaStyles(
      olMap.getView().getProjection()
    );
    const vector = new Vector("panorama", {
      title: "Panorama",
      isTopLayer: true,
      style: dot,
    });
    vectorRef.current = vector;
    mapStore.addLayer(vector);

    const interaction = new Draw({ type: "Point", style: search });
    interaction.setActive(false);
    interactionRef.current = interaction;
    olMap.addInteraction(interaction);

    interaction.on("drawend", (evt) => onDrawEndRef.current?.(evt));

    return () => {
      interaction.setActive(false);
      olMap.removeInteraction(interaction);
      vector.getSource()?.clear();
      mapStore.removeLayer(vector);

      interactionRef.current = null;
      vectorRef.current = null;
    };
  }, [mapStore, olMap]);

  useEffect(() => {
    const source = vectorRef.current?.getSource();
    if (!source) return;

    source.clear();
    if (!position) return;

    const projection = olMap.getView().getProjection();
    const { lat, lng } = position;
    const coordinates = fromLonLat([lng, lat], projection);
    source.addFeature(new Feature(new Point(coordinates)));
  }, [olMap, position]);

  const onToggle = useCallback(
    (active: boolean) => {
      setActive(active);
      requestIdRef.current++;
      interactionRef.current?.setActive(active);
      if (!active) store.close();
    },
    [store]
  );

  return (
    <>
      {contextHolder}
      <ToggleControl
        {...rest}
        groupId={groupId}
        title={msgTitle}
        onChange={onToggle}
      >
        <PanoramaIcon />
      </ToggleControl>
      {active && checker}
    </>
  );
});

ToolPanorama.displayName = "ToolPanorama";
export default ToolPanorama;
