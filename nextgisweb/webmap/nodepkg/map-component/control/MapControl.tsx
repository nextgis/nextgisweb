import { useEffect } from "react";
import { createPortal } from "react-dom";

import { updateControlAppearance } from "@nextgisweb/webmap/control-container/updateControlAppearance";

import { useMapControl } from "../hook/useMapControl";

import { MapControlContext } from "./MapControlContext";
import type { MapControlProps } from "./MapControlContext";

export { MapControlContext, useMapControlContext } from "./MapControlContext";
export type {
  ControlProps,
  ControlOptions,
  MapControlProps,
} from "./MapControlContext";

export function MapControl({ children, ...props }: MapControlProps) {
  const { margin, bar, style, className, element } = useMapControl({
    ...props,
  });

  useEffect(() => {
    if (element) {
      updateControlAppearance(element, { bar, margin, className, style });
    }
  }, [element, bar, className, margin, style]);

  if (!element || !children) return null;

  return createPortal(
    <MapControlContext value={props}>{children}</MapControlContext>,
    element
  );
}
