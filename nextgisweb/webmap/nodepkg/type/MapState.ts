import type { DojoDisplayIdentify } from "./DojoDisplay";

export interface MapStateControl {
    activate: () => void;
    deactivate: () => void;
}

export interface MapStatesObserver {
    addState: (
        state: string,
        control?: MapStateControl | DojoDisplayIdentify,
        activate?: boolean
    ) => void;
    removeState: (state: string) => void;
    activateState: (state: string) => boolean;
    deactivateState: (state: string) => boolean;
    setDefaultState: (state: string, activate?: boolean) => void;
    activateDefaultState: () => void;
    getActiveState: () => string;
}
