import debounce from "lodash/debounce";
import { observer } from "mobx-react-lite";
import { unByKey } from "ol/Observable";
import type { EventsKey } from "ol/events";
import type { Geometry } from "ol/geom";
import { Draw } from "ol/interaction";
import type { DrawEvent } from "ol/interaction/Draw";
import VectorLayer from "ol/layer/Vector";
import VectorSource from "ol/source/Vector";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { makeUid } from "@nextgisweb/pyramid/util";
import settings from "@nextgisweb/webmap/client-settings";

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

    const { olMap, maxZIndex } = mapStore;

    const [currentTooltipId, setCurrentTooltipId] = useState<string | null>(
        null
    );

    const vectorRef = useRef<VectorLayer<VectorSource> | null>(null);
    const interactionRef = useRef<Draw | null>(null);
    const changeListenerRef = useRef<EventsKey | null>(null);
    const maxZIndexRef = useRef(maxZIndex);

    const [tooltips, setTooltips] = useState<Map<string, TooltipState>>(
        new Map()
    );
    const debouncedRef = useRef(new Map<string, ReturnType<typeof debounce>>());

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
        const d = debouncedRef.current.get(id);
        if (d) {
            d.cancel();
            debouncedRef.current.delete(id);
        }

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

    useEffect(() => {
        const style = createMeasureStyle();
        const source = new VectorSource();
        const vector = new VectorLayer({ source, style });
        vectorRef.current = vector;
        const debouncedMap = debouncedRef.current;

        olMap.addLayer(vector);
        vector.setZIndex(maxZIndexRef.current + 100);

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

                let d = debouncedMap.get(curId);
                if (!d) {
                    d = debounce(async (g: Geometry) => {
                        const srsId =
                            mapStore.measureSrsId || settings.measurement_srid;
                        if (srsId === null || !isValidGeometry(g)) return;

                        try {
                            const isArea = g.getType() === "Polygon";
                            const resp = await route(
                                isArea
                                    ? "spatial_ref_sys.geom_area"
                                    : "spatial_ref_sys.geom_length",
                                { id: srsId }
                            ).post({
                                json: {
                                    geom: toGeoJSONRightHanded(g),
                                    geom_format: "geojson",
                                    srs: getMapSRID(olMap),
                                },
                            });

                            updateTooltip(curId, {
                                children: formatUnits(resp.value, isArea),
                            });
                        } catch {
                            updateTooltip(curId, { children: "@#!*~^$" });
                        }
                    }, 200);
                    debouncedMap.set(curId, d);
                }

                d(geom);
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
            olMap.removeLayer(vector);

            interactionRef.current = null;
            vectorRef.current = null;

            debouncedMap.forEach((fn) => fn.cancel());
            debouncedMap.clear();

            setCurrentTooltipId(null);

            unbindChangeListener();
        };
    }, [closeTooltip, mapStore, olMap, type, updateTooltip]);

    useEffect(() => {
        vectorRef.current?.setZIndex(maxZIndex + 1);
        maxZIndexRef.current = maxZIndex;
    }, [maxZIndex]);

    const setActive = useCallback((active: boolean) => {
        const interaction = interactionRef.current;
        if (!interaction) return;

        interaction.setActive(active);

        if (!active) {
            vectorRef.current?.getSource()?.clear();

            debouncedRef.current.forEach((fn) => fn.cancel());
            debouncedRef.current.clear();

            setTooltips(new Map());
            setCurrentTooltipId(null);
        }
    }, []);

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
