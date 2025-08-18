import { createContext } from "react";

export interface ToggleGroupContextValue {
    present: boolean;
    activeId: string | null;
    setActiveId: (id: string | null) => void;
    setDefaultId?: (id: string | null) => void;
    isActive: (id: string) => boolean;
}

export const ToggleGroupContext = createContext<ToggleGroupContextValue>({
    present: false,
    activeId: null,
    setActiveId: () => {},
    setDefaultId: () => {},
    isActive: () => false,
});
