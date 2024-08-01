import type { FC } from "react";

import type { IdentifyExtensionComponentProps } from "./identification";
import { registry } from "./registry";

const extWidgetClasses = new Map<
    string,
    Promise<FC<IdentifyExtensionComponentProps>>
>();
let loaded = false;

export const loadFeatureLayerExtensions = async (): Promise<void> => {
    try {
        let idx = 0;
        for (const p of registry.query()) {
            extWidgetClasses.set(`plugin${idx++}`, p.load());
        }
    } catch (error) {
        console.error("Error loading extensions:", error);
    }

    loaded = true;
};

export const getExtensionsComps = async () => {
    if (!loaded) {
        await loadFeatureLayerExtensions();
    }
    return extWidgetClasses;
};
