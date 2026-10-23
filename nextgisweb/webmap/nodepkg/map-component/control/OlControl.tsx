import type OlMap from "ol/Map";
import type Control from "ol/control/Control";
import { useEffect } from "react";

import type { TargetPosition } from "@nextgisweb/webmap/control-container/ControlContainer";
import type { MapStore } from "@nextgisweb/webmap/ol/MapStore";

import { useMapControl } from "../hook/useMapControl";

export interface OlControlProps<T extends Control> {
  olMap: OlMap;
  position?: TargetPosition;
  order?: number;
  ctor: (map: MapStore) => T | Promise<T>;
}

function OlControl<T extends Control>({
  olMap,
  order,
  position,
  ctor,
}: OlControlProps<T>) {
  const { element, context } = useMapControl({ position, order });

  useEffect(() => {
    let ctrl: T | undefined = undefined;
    let canceled = false;
    const map = context.mapStore;

    async function setupControl() {
      const control = await ctor(map);
      if (canceled) {
        control.dispose();
        return;
      }
      ctrl = control;
      control.setTarget(element);
      olMap.addControl(control);
    }
    setupControl();

    return () => {
      canceled = true;
      if (ctrl) {
        olMap.removeControl(ctrl);
      }
    };
  }, [ctor, context.mapStore, element, olMap]);

  return null;
}

export default OlControl;
