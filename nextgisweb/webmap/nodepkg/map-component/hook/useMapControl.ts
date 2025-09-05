import type Control from "ol/control/Control";
import { useEffect, useMemo, useRef, useState } from "react";

import type { TargetPosition } from "@nextgisweb/webmap/control-container/ControlContainer";

import { useMapContext } from "../context/useMapContext";
import { useMapControlContext } from "../control";
import type { ControlOptions } from "../control";

const DEFAULT_POSITION: TargetPosition = "top-left";

export function useMapControl<T extends Control>({
    id,
    order,
    targetStyle,
    ...props
}: ControlOptions) {
    const [instance, setInstance] = useState<T | null>(null);
    const context = useMapContext();
    const parent = useMapControlContext();
    const inside = parent && parent.id;

    const targetStyleRef = useRef(targetStyle);
    useEffect(() => {
        targetStyleRef.current = targetStyle;
    }, [targetStyle]);

    const [position, margin] = useMemo<
        [TargetPosition, boolean | undefined]
    >(() => {
        if (inside) {
            return [{ inside }, false];
        }
        return [props.position || DEFAULT_POSITION, props.margin];
    }, [props, inside]);

    const orderRef = useRef(order);
    const positionRef = useRef(position);

    const added = useRef<Control>(null);

    useEffect(
        function addControl() {
            const mapStore = context.mapStore;
            if (instance && mapStore) {
                const control = mapStore.addControl({
                    id,
                    order: orderRef.current,
                    control: instance,
                    position: positionRef.current,
                    targetStyle: targetStyleRef.current,
                });
                if (control) {
                    added.current = control;
                }
            }

            return function removeControl() {
                if (mapStore && added.current) {
                    mapStore.removeControl(added.current);
                    added.current = null;
                }
            };
        },
        [instance, context.mapStore, id]
    );

    useEffect(() => {
        if (added.current) {
            const target = context.mapStore.panelControl.getTarget(
                added.current
            );
            if (target) {
                Object.assign(target.style, targetStyle);
            }
        }
    }, [targetStyle, context.mapStore]);

    useEffect(() => {
        const mapStore = context.mapStore;
        orderRef.current = order;
        positionRef.current = position;

        if (mapStore && added.current) {
            mapStore.updateControlPlacement(added.current, position, order);
        }
    }, [context, order, position]);

    return { ...props, setInstance, instance, position, margin, context };
}
