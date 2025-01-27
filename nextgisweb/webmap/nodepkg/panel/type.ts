import type { FunctionComponent, ReactNode } from "react";

import type { LoaderObject } from "@nextgisweb/jsrealm/plugin/loader";

import type { Display } from "../display";
import type { PanelStore } from "../panel/PanelStore";

export type PanelWidget<S extends PanelStore = PanelStore> = FunctionComponent<{
    store: S;
    display: Display;
}>;

export interface PanelMeta {
    name: string;
    title: string;
    icon: ReactNode;
    order: number;
    applyToTinyMap?: boolean;

    storeClass?: typeof PanelStore;
    isEnabled?: ({ config }: { config: Display["config"] }) => boolean;
    startup?: (display: Display) => Promise<void>;
}

export type PanelPlugin = LoaderObject<PanelWidget, PanelMeta> &
    Readonly<PanelMeta>;
