/** @registry */
import type { FC } from "react";

import { pluginRegistry } from "@nextgisweb/jsrealm/plugin";

import type {
  AvailabilityResult,
  PanoramaProviderIdentity,
  PanoramaProviderProps,
} from "../type";

export interface PanoramaProviderPlugin {
  identity: PanoramaProviderIdentity;
  title: string;
  requiresKey: boolean;
  component: FC<PanoramaProviderProps>;
  checkAvailability: (
    apiKey: string,
    lat: number,
    lng: number
  ) => Promise<AvailabilityResult>;
}

export const registry = pluginRegistry<PanoramaProviderPlugin>(MODULE_NAME);

export function panoramaProviderRegistry(
  compId: string,
  plugin: PanoramaProviderPlugin
) {
  registry.register(compId, plugin);
}
