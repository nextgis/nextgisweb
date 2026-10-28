import { useEffect, useMemo, useRef, useState } from "react";

import type { TargetPosition } from "@nextgisweb/webmap/control-container/ControlContainer";

import { useMapContext } from "../context/useMapContext";
import { useMapControlContext } from "../control";
import type { ControlOptions } from "../control";

const DEFAULT_POSITION: TargetPosition = "top-left";

export function useMapControl({
  id,
  order,
  targetStyle,
  ...props
}: ControlOptions) {
  const [element] = useState(() => document.createElement("div"));
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

  useEffect(
    function addControl() {
      const mapStore = context.mapStore;
      mapStore.addControl({
        id,
        order: orderRef.current,
        element,
        position: positionRef.current,
        targetStyle: targetStyleRef.current,
      });

      return function removeControl() {
        mapStore.removeControl(element);
      };
    },
    [element, context.mapStore, id]
  );

  useEffect(() => {
    const target = context.mapStore.getControlTarget(element);
    if (target) {
      Object.assign(target.style, targetStyle);
    }
  }, [element, targetStyle, context.mapStore]);

  useEffect(() => {
    const mapStore = context.mapStore;
    orderRef.current = order;
    positionRef.current = position;

    mapStore.updateControlPlacement(element, position, order);
  }, [element, context, order, position]);

  return { ...props, element, position, margin, context };
}
