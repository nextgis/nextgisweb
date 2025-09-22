import type Control from "ol/control/Control";
import { useEffect } from "react";

import type { TargetPosition } from "@nextgisweb/webmap/control-container/ControlContainer";
import type { MapStore } from "@nextgisweb/webmap/ol/MapStore";

import { useMapControl } from "../hook/useMapControl";

export interface OlControlProps<T extends Control> {
    ctor: (map: MapStore) => T | Promise<T>;
    position?: TargetPosition;
    order?: number;
}

export default function OlControl<T extends Control>({
    ctor,
    order,
    position,
}: OlControlProps<T>) {
    const { setInstance, context } = useMapControl({ position, order });

    useEffect(() => {
        let ctrl: T | undefined = undefined;
        const map = context.mapStore;
        if (map) {
            async function setupControl(map_: MapStore) {
                ctrl = await ctor(map_);
                setInstance(ctrl);
            }
            setupControl(map);
        }

        return () => {
            if (ctrl && context.mapStore) {
                context.mapStore.olMap.removeControl(ctrl);
                setInstance(null);
            }
        };
    }, [ctor, context.mapStore, setInstance]);

    return null;
}
