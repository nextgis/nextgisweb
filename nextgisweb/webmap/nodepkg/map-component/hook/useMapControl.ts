import type Control from "ol/control/Control";
import { useEffect, useMemo, useRef } from "react";

import type { TargetPosition } from "@nextgisweb/webmap/control-container/ControlContainer";

import type { MapContextValue } from "../context/useMapContext";

export function useMapControl({
    id,
    order,
    context,
    instance,
    position = "top-left",
    targetStyle,
}: {
    id?: string;
    order?: number;
    context: MapContextValue | null;
    instance?: Control;
    position?: TargetPosition;
    targetStyle?: Partial<CSSStyleDeclaration>;
}) {
    const orderRef = useRef(order);
    const positionRef = useRef(position);

    const added = useRef<Control>(null);
    const mapStore = useMemo(() => {
        return context?.mapStore;
    }, [context?.mapStore]);
    useEffect(
        function addControl() {
            if (instance && mapStore) {
                const control = mapStore.addControl({
                    id,
                    order: orderRef.current,
                    control: instance,
                    position: positionRef.current,
                    targetStyle,
                });
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
        [mapStore, instance, id, targetStyle]
    );

    useEffect(() => {
        orderRef.current = order;
        positionRef.current = position;

        if (mapStore && added.current) {
            mapStore.updateControlPlacement(added.current, position, order);
        }
    }, [mapStore, order, position]);
}
