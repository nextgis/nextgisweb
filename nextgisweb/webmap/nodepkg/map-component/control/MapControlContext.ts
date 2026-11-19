import { createContext, use } from "react";
import type { CSSProperties, ReactNode } from "react";

import type {
  CreateControlOptions,
  TargetPosition,
} from "../../control-container/ControlContainer";

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
