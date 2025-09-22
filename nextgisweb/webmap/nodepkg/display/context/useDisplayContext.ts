import { createContext, useContext } from "react";

import type { Display } from "../Display";

export interface DisplayContextValue {
    display: Display;
}

export const DisplayContext = createContext<DisplayContextValue | null>(null);

export function useDisplayContext(): DisplayContextValue {
    const context = useContext(DisplayContext);
    if (context === null) {
        throw new Error(
            "No context provided: useDisplayContext() can only be used in a descendant of <DisplayWidget>"
        );
    }
    return context;
}
