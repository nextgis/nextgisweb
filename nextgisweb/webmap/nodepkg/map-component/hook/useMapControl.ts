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
    const mapAdapter = useMemo(() => {
        return context?.mapAdapter;
    }, [context?.mapAdapter]);
    useEffect(
        function addControl() {
            if (instance && mapAdapter) {
                const control = mapAdapter.addControl(instance, position);
                if (control) {
                    added.current = control;
                    // if (control.getContainer)
                    //     setContainer(control.getContainer());
                }
            }

            return function removeControl() {
                if (mapAdapter && added.current) {
                    mapAdapter.removeControl(added.current);
                }
            };
        },
        [context, mapAdapter, instance, position]
    );

    // return {
    //     container,
    // };
}
