import type { Display } from "../display";

import type { PanelStore } from "./PanelStore";

export type PanelComponentProps<T = unknown> = {
    store: PanelStore;
    display: Display;
} & T;
