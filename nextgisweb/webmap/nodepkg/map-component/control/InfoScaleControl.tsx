import { useEffect, useState } from "react";

import { useMapContext } from "../context/useMapContext";

import { MapControl } from "./MapControl";
import type { ControlProps } from "./MapControl";

export default function InfoScaleControl({ position }: ControlProps) {
    const { mapStore } = useMapContext();
    const [scale, setScale] = useState<number | null>(null);

    useEffect(() => {
        const updateScale = (val: number | null) => {
            if (val === null) return;
            const view = mapStore.olMap.getView();
            const projection = view.getProjection();
            const mpu = projection?.getMetersPerUnit?.() ?? 1;
            setScale(Math.round(mapStore.getScaleForResolution(val, mpu)));
        };

        const unsubscribe = mapStore.watch(
            "resolution",
            (_attr, _oldVal, newVal) => {
                updateScale(newVal);
            }
        );
        const view = mapStore.olMap.getView();
        updateScale(view.getResolution() || null);
        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [mapStore]);

    return (
        <MapControl position={position}>
            <span className="ol-control ol-scaleInfo ol-unselectable">
                {scale ? `1 : ${scale}` : ""}
            </span>
        </MapControl>
    );
}
