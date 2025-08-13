import type Control from "ol/control/Control";
import { useEffect, useMemo, useRef } from "react";

import type { ControlPosition } from "@nextgisweb/webmap/control-container/ControlContainer";

import type { MapContextValue } from "../context/useMapContext";

export function useMapControl({
    context,
    instance,
    position = "top-left",
}: {
    context: MapContextValue | null;
    instance?: Control;
    position?: ControlPosition;
}) {
    const added = useRef<Control>(null);
    const mapStore = useMemo(() => {
        return context?.mapStore;
    }, [context?.mapStore]);
    useEffect(
        function addControl() {
            if (instance && mapStore) {
                const control = mapStore.addControl(instance, position);
                if (control) {
                    added.current = control;
                }
            }

            return function removeControl() {
                if (mapStore && added.current) {
                    mapStore.removeControl(added.current);
                }
            };
        },
        [mapStore, instance, position]
    );
}
