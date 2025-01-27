import type { FC } from "react";

import type { ImportCallback } from "@nextgisweb/jsrealm/plugin";
import { registry } from "@nextgisweb/webmap/identification/registry";

import type { IdentifyExtensionComponentProps } from "./identification";

const extWidgetClasses = new Map<
    string,
    ImportCallback<FC<IdentifyExtensionComponentProps<any>>>
>();
let loaded = false;

export const loadFeatureLayerExtensions = async (): Promise<void> => {
    try {
        let idx = 0;
        for (const p of registry.query()) {
            extWidgetClasses.set(`plugin${idx++}`, p);
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
