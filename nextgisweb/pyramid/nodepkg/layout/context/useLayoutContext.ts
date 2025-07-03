import { createContext, useContext } from "react";

import type { MessageAPI, ModalAPI } from "../type";

export interface LayoutContextValue {
    modal: ModalAPI | null;
    message: MessageAPI | null;
}

export const LayoutContext = createContext<LayoutContextValue | null>(null);

export function useLayoutContext(): LayoutContextValue {
    const context = useContext(LayoutContext);
    if (context === null) {
        throw new Error(
            "No context provided: useLayoutContext() can only be used in a descendant of <Base>"
        );
    }
    return context;
}
