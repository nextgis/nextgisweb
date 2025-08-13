import type Control from "ol/control/Control";
import { useEffect, useState } from "react";

import type { ControlPosition } from "@nextgisweb/webmap/control-container/ControlContainer";
import type { MapStore } from "@nextgisweb/webmap/ol/MapStore";

import { useMapContext } from "../context/useMapContext";
import { useMapControl } from "../hook/useMapControl";

export interface MapControlProps<T extends Control> {
    ctor: (map: MapStore) => Promise<T>;
    position?: ControlPosition;
}

export default function OlControl<T extends Control>({
    ctor,
    position,
}: MapControlProps<T>) {
    const context = useMapContext();
    const [instance, setInstance] = useState<T>();
    useMapControl({ context, instance, position });

    useEffect(() => {
        let ctrl: T | undefined = undefined;
        const map = context.mapStore;
        if (map) {
            async function getCtrl(map_: MapStore) {
                ctrl = await ctor(map_);
                setInstance(ctrl);
            }
            getCtrl(map);
        }

        return () => {
            if (ctrl && context.mapStore) {
                context.mapStore.olMap.removeControl(ctrl);
            }
        };
    }, [ctor, context]);

    return null;
}
