import { observer } from "mobx-react-lite";
import { unByKey } from "ol/Observable";
import type { EventsKey } from "ol/events";
import type { Geometry } from "ol/geom";
import { Draw } from "ol/interaction";
import type { DrawEvent } from "ol/interaction/Draw";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { route } from "@nextgisweb/pyramid/api";
import { useDebounce } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { makeUid } from "@nextgisweb/pyramid/util";
import settings from "@nextgisweb/webmap/client-settings";
import Vector from "@nextgisweb/webmap/ol/layer/Vector";

import { useMapContext } from "../../context/useMapContext";
import { ToggleControl } from "../../control";
import type { ToggleControlProps } from "../../control";

import { MeasureTooltip } from "./MeasureTooltip";
import type { MeasureTooltipProps } from "./MeasureTooltip";
import {
  createMeasureStyle,
  formatUnits,
  getMapSRID,
  getTooltipCoordinate,
  isValidGeometry,
  toGeoJSONRightHanded,
} from "./util/measureUtils";

import MeasureArea from "@nextgisweb/webmap/icon/measure_area";
import MeasureDistance from "@nextgisweb/webmap/icon/measure_distance";

import "./Measure.less";

type MeasureKind = "LineString" | "Polygon";

export interface ToolMeasureProps extends ToggleControlProps {
  type: MeasureKind;
  groupId?: string;
  isDefaultGroupId?: boolean;
}

type TooltipState = MeasureTooltipProps & {
  id: string;
};

const ToolMeasure = observer(({ type, groupId, ...rest }: ToolMeasureProps) => {
  const { mapStore } = useMapContext();

  const { olMap } = mapStore;
  const measureSrsId = mapStore.measureSrsId || settings.measurement_srid;

  const [currentTooltipId, setCurrentTooltipId] = useState<string | null>(null);

  const vectorRef = useRef<Vector | null>(null);
  const interactionRef = useRef<Draw | null>(null);
  const changeListenerRef = useRef<EventsKey | null>(null);
  const measureSrsIdRef = useRef(measureSrsId);
  const measureRevisionRef = useRef(0);

  const [tooltips, setTooltips] = useState<Map<string, TooltipState>>(
    new Map()
  );

  const title = useMemo(
    () =>
      type === "LineString"
        ? gettext("Measure distance")
        : gettext("Measure area"),
    [type]
  );

  const iconEl = useMemo(
    () => (type === "LineString" ? <MeasureDistance /> : <MeasureArea />),
    [type]
  );

  const updateTooltip = useCallback(
    (id: string, state: Partial<Omit<TooltipState, "id">>) => {
      setTooltips((prev) => {
        const curr = prev.get(id);
        if (!curr) return prev;
        const next = new Map(prev);
        next.set(id, { ...curr, ...state });
        return next;
      });
    },
    []
  );

  const closeTooltip = useCallback((id: string) => {
    setTooltips((prev) => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });

    const source = vectorRef.current?.getSource();
    if (source) {
      const feature = source.getFeatureById(id);
      if (feature) source.removeFeature(feature);
    }
  }, []);

  const updateMeasuredValue = useCallback(
    async (id: string, geometry: Geometry, revision: number) => {
      const srsId = measureSrsIdRef.current;
      if (!srsId || !isValidGeometry(geometry)) return;

      try {
        const isArea = geometry.getType() === "Polygon";
        const resp = await route(
          isArea ? "spatial_ref_sys.geom_area" : "spatial_ref_sys.geom_length",
          { id: srsId }
        ).post({
          json: {
            geom: toGeoJSONRightHanded(geometry),
            geom_format: "geojson",
            srs: getMapSRID(olMap),
          },
        });

        if (revision !== measureRevisionRef.current) return;

        updateTooltip(id, {
          children: formatUnits(resp.value, isArea),
        });
      } catch {
        if (revision !== measureRevisionRef.current) return;
        updateTooltip(id, { children: "@#!*~^$" });
      }
    },
    [olMap, updateTooltip]
  );

  const debouncedUpdateMeasuredValue = useDebounce(updateMeasuredValue, 200);

  useEffect(() => {
    const style = createMeasureStyle();
    const vector = new Vector("measure", {
      title: "Measure",
      isTopLayer: true,
      style,
    });
    const source = vector.getSource();
    vectorRef.current = vector;

    mapStore.addLayer(vector);

    const interaction = new Draw({ source, type, style });
    interaction.setActive(false);
    interactionRef.current = interaction;
    olMap.addInteraction(interaction);

    const onDrawStart = (evt: DrawEvent) => {
      const id = makeUid();
      setCurrentTooltipId(id);

      evt.feature.setId(id);

      const geometry = evt.feature.getGeometry();
      if (!geometry) return;

      changeListenerRef.current = geometry.on("change", (e) => {
        const geom: Geometry = e.target;
        if (!isValidGeometry(geom)) return;

        const position = getTooltipCoordinate(geom);
        if (!position) return;

        const curId = id;
        if (curId === null) return;

        setTooltips((prev) => {
          const cur = prev.get(curId);
          if (cur && cur.position) {
            if (
              cur.position[0] === position[0] &&
              cur.position[1] === position[1]
            ) {
              return prev;
            }
          }
          const next = new Map(prev);

          next.set(curId, {
            id: curId,
            position,
            children: "...",
            onClose: () => closeTooltip(curId),
          });
          return next;
        });

        debouncedUpdateMeasuredValue(curId, geom, measureRevisionRef.current);
      });
    };

    const unbindChangeListener = () => {
      if (changeListenerRef.current) {
        unByKey(changeListenerRef.current);
        changeListenerRef.current = null;
      }
    };

    const onDrawEnd = () => {
      unbindChangeListener();
      setCurrentTooltipId(null);
    };

    interaction.on("drawstart", onDrawStart);
    interaction.on("drawend", onDrawEnd);

    return () => {
      interaction.setActive(false);
      olMap.removeInteraction(interaction);
      vector.getSource()?.clear();
      mapStore.removeLayer(vector);

      interactionRef.current = null;
      vectorRef.current = null;

      debouncedUpdateMeasuredValue.cancel();
      measureRevisionRef.current = measureRevisionRef.current + 1;

      setCurrentTooltipId(null);

      unbindChangeListener();
    };
  }, [closeTooltip, debouncedUpdateMeasuredValue, mapStore, olMap, type]);

  useEffect(() => {
    measureSrsIdRef.current = measureSrsId;
    measureRevisionRef.current = measureRevisionRef.current + 1;

    const revision = measureRevisionRef.current;
    const source = vectorRef.current?.getSource();
    if (!source) return;

    source.getFeatures().forEach((feature) => {
      const id = feature.getId();
      const geometry = feature.getGeometry();
      if (id === undefined || !geometry || !isValidGeometry(geometry)) {
        return;
      }

      void updateMeasuredValue(String(id), geometry, revision);
    });
  }, [measureSrsId, updateMeasuredValue]);

  const setActive = useCallback(
    (active: boolean) => {
      const interaction = interactionRef.current;
      if (!interaction) return;

      interaction.setActive(active);

      if (!active) {
        vectorRef.current?.getSource()?.clear();

        debouncedUpdateMeasuredValue.cancel();
        measureRevisionRef.current++;

        setTooltips(new Map());
        setCurrentTooltipId(null);
      }
    },
    [debouncedUpdateMeasuredValue]
  );

  return (
    <>
      <ToggleControl
        {...rest}
        groupId={groupId}
        title={title}
        onChange={setActive}
      >
        {iconEl}
      </ToggleControl>

      {Array.from(tooltips).map(([id, tooltip]) => (
        <MeasureTooltip
          key={id}
          {...tooltip}
          staticMode={currentTooltipId !== id}
        ></MeasureTooltip>
      ))}
    </>
  );
});

ToolMeasure.displayName = "ToolMeasure";
export default ToolMeasure;
