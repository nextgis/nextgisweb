import type { Feature as OlFeature } from "ol";
import { unByKey } from "ol/Observable";
import { pointerMove } from "ol/events/condition";
import { MultiPolygon, Polygon } from "ol/geom";
import type { Geometry } from "ol/geom";
import { Draw, Select } from "ol/interaction";
import VectorSource from "ol/source/Vector";
import Style from "ol/style/Style";
import { useCallback, useEffect, useRef, useState } from "react";

import { message } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";
import {
    MapToolbarControl,
    ToggleControl,
} from "@nextgisweb/webmap/map-component";

import { EDITING_STATES } from "../constant";
import { useEditorContext } from "../context/useEditorContext";
import { useInteraction } from "../hook/useInteraction";

import { DrawControl } from "./component/DrawControl";

import HoleIcon from "@nextgisweb/icon/material/content_cut";

const msgEmptyClick = gettext("Click inside a polygon to start cutting a hole");

export function HoleMode({ order }: { order?: number }) {
    const [messageApi, contextHolder] = message.useMessage();

    const { olMap, layer, addUndo, selectStyle, selectStyleOptions } =
        useEditorContext();
    const [active, setActive] = useState(false);

    const hoveredRef = useRef<OlFeature<Geometry> | null>(null);
    const selectedRef = useRef<OlFeature<Geometry> | null>(null);
    const tempSourceRef = useRef(new VectorSource());

    const lastPixelRef = useRef<[number, number] | null>(null);

    const clear = useCallback(() => {
        hoveredRef.current?.setStyle(undefined);
        selectedRef.current?.setStyle(undefined);
        hoveredRef.current = null;
        selectedRef.current = null;
    }, []);

    useEffect(() => {
        if (!olMap || !active) return;
        const key = olMap.on("pointermove", (evt: any) => {
            lastPixelRef.current = evt.pixel as [number, number];
        });
        return () => {
            unByKey(key);
        };
    }, [olMap, active]);

    const resetHover = useCallback(() => {
        if (!olMap || !lastPixelRef.current || selectedRef.current) return;

        const [found] = olMap.getFeaturesAtPixel(lastPixelRef.current, {
            layerFilter: (lyr) => lyr === layer,
        }) as OlFeature<Geometry>[];

        if (!found) return;

        clear();

        hoveredRef.current = found;

        if (found !== selectedRef.current) {
            found.setStyle(new Style({ ...selectStyleOptions, zIndex: 9998 }));
        }
    }, [olMap, clear, layer, selectStyleOptions]);

    const createHover = useCallback(() => {
        const hover = new Select({
            layers: [layer],
            style: selectStyle,
            condition: pointerMove,
            multi: false,
        });

        hover.on("select", (e) => {
            if (selectedRef.current) return;
            if (e.selected.length > 0) {
                const f = e.selected[0];
                if (
                    hoveredRef.current &&
                    hoveredRef.current !== selectedRef.current
                ) {
                    hoveredRef.current.setStyle(undefined);
                }
                hoveredRef.current = f;
                if (f !== selectedRef.current) {
                    f.setStyle(
                        new Style({ ...selectStyleOptions, zIndex: 9998 })
                    );
                }
            }
        });

        return hover;
    }, [layer, selectStyle, selectStyleOptions]);

    const hoverInteraction = useInteraction(
        `${EDITING_STATES.HOLE}-hover`,
        active,
        createHover
    );

    const createDrawHole = useCallback(() => {
        const draw = new Draw({
            type: "Polygon",
            source: tempSourceRef.current,
            style: selectStyle,
        });

        draw.on("drawstart", () => {
            const target = hoveredRef.current;
            if (!target) {
                draw.abortDrawing();
                messageApi.warning({ content: msgEmptyClick });
                return;
            }
            selectedRef.current = target;
            target.setStyle(new Style({ ...selectStyleOptions, zIndex: 9999 }));
            hoverInteraction.setActive(false);
        });

        draw.on("drawend", (e) => {
            try {
                const target = selectedRef.current;
                if (!target) return;

                const geom = target.getGeometry();
                const holePoly = e.feature.getGeometry() as Polygon;
                const ringCoords = holePoly.getLinearRing(0)?.getCoordinates();
                if (!geom || !ringCoords) return;

                const backup = geom.clone();

                if (geom instanceof Polygon) {
                    const coords = geom.getCoordinates();
                    coords.push(ringCoords);
                    geom.setCoordinates(coords);
                    target.setGeometry(geom);
                    addUndo(() => target.setGeometry(backup));
                } else if (geom instanceof MultiPolygon) {
                    const mpCoords = geom.getCoordinates();
                    const tmp = new Polygon([]);

                    const hostIdx = mpCoords.findIndex((polyCoords) => {
                        tmp.setCoordinates([polyCoords[0]]);
                        return ringCoords.every((c) =>
                            tmp.intersectsCoordinate(c)
                        );
                    });

                    if (hostIdx === -1) {
                        messageApi.warning({ content: msgEmptyClick });
                        return;
                    }

                    mpCoords[hostIdx].push(ringCoords);
                    geom.setCoordinates(mpCoords);
                    target.setGeometry(geom);
                    addUndo(() => target.setGeometry(backup));
                }
            } finally {
                tempSourceRef.current.removeFeature(e.feature);
                clear();
                hoverInteraction.setActive(true);
                resetHover();
            }
        });

        return draw;
    }, [
        clear,
        addUndo,
        resetHover,
        messageApi,
        selectStyle,
        hoverInteraction,
        selectStyleOptions,
    ]);

    const draw = useInteraction(
        `${EDITING_STATES.HOLE}-draw`,
        active,
        createDrawHole
    );

    const onChange = useCallback(
        (val: boolean) => {
            setActive(val);
            if (!val) {
                tempSourceRef.current.clear();
                clear();
                hoverInteraction.setActive(false);
            } else {
                hoverInteraction.setActive(true);
            }
        },
        [clear, hoverInteraction]
    );

    return (
        <>
            {contextHolder}
            <MapToolbarControl
                id="draw-hole-control"
                order={order}
                direction="horizontal"
                gap={2}
            >
                <ToggleControl
                    groupId={EDITING_STATES.HOLE}
                    title={gettext("Cut hole")}
                    order={-1}
                    onChange={onChange}
                >
                    <HoleIcon />
                </ToggleControl>
                {active && <DrawControl draw={draw} />}
            </MapToolbarControl>
        </>
    );
}
