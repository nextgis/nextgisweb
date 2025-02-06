import type Control from "ol/control/Control";
import { useEffect, useMemo, useRef } from "react";

import type { ControlPosition } from "@nextgisweb/webmap/control-container/ControlContainer";

import type { MapAdapterRef } from "../context/useMapContext";

export function useMapControl({
    context,
    instance,
    position = "top-left",
}: {
    context: MapAdapterRef | null;
    instance?: Control;
    position?: ControlPosition;
}) {
    // const [container, setContainer] = useState<HTMLElement>();
    const added = useRef<Control>();
    const mapStore = useMemo(() => {
        return context?.mapStore;
    }, [context?.mapStore]);
    useEffect(
        function addControl() {
            if (instance && mapStore) {
                const control = mapStore.addControl(instance, position);
                if (control) {
                    added.current = control;
                    // if (control.getContainer)
                    //     setContainer(control.getContainer());
                }
            }

            return function removeControl() {
                if (mapStore && added.current) {
                    mapStore.removeControl(added.current);
                }
            };
        },
        [context, mapStore, instance, position]
    );

    // return {
    //     container,
    // };
}
