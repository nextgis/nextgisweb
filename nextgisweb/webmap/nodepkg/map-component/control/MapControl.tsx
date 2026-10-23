import { createContext, use, useEffect } from "react";
import type { CSSProperties, ReactNode } from "react";
import { createPortal } from "react-dom";

import { updateControlAppearance } from "@nextgisweb/webmap/control-container/updateControlAppearance";

import type {
  CreateControlOptions,
  TargetPosition,
} from "../../control-container/ControlContainer";
import { useMapControl } from "../hook/useMapControl";

export type ControlProps<P = unknown> = P & {
  position?: TargetPosition;
  order?: number;
  id?: string;
};

export type ControlOptions = CreateControlOptions &
  ControlProps<{
    style?: CSSProperties;
    className?: string;
    targetStyle?: CSSProperties;
  }>;

export interface MapControlProps extends ControlOptions {
  children?: ReactNode;
}

export const MapControlContext = createContext<MapControlProps | null>(null);
MapControlContext.displayName = "MapControlContext";
export function useMapControlContext() {
  return use(MapControlContext);
}

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
