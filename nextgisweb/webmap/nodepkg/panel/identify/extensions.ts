import type { FC, LazyExoticComponent } from "react";

import { registry } from "@nextgisweb/webmap/identification/registry";

import type { IdentifyExtensionComponentProps } from "./identification";

const extWidgetClasses = new Map<
  string,
  LazyExoticComponent<FC<IdentifyExtensionComponentProps<any>>>
>();
let loaded = false;

export const loadFeatureLayerExtensions = async (): Promise<void> => {
  try {
    let idx = 0;
    for (const p of registry.query()) {
      extWidgetClasses.set(`plugin${idx++}`, p);
    }
  } catch (err) {
    console.error("Error loading extensions:", err);
  }

  loaded = true;
};

export const getExtensionsComps = async () => {
  if (!loaded) {
    await loadFeatureLayerExtensions();
  }
  return extWidgetClasses;
};
