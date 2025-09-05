import { createContext } from "react";

export interface ToggleGroupContextValue {
    activeId: string | null;
    setActiveId: (id: string | null) => void;
    setDefaultId?: (id: string | null) => void;
    isActive: (id: string) => boolean;
}

export const ToggleGroupContext = createContext<ToggleGroupContextValue | null>(
    null
);
