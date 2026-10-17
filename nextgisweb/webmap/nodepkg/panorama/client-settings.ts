import cs from "@nextgisweb/webmap/client-settings";

import { registry } from "./provider/registry";

export const panoramaSettings = cs.panorama;

export const configuredProviders = registry
  .queryAll()
  .filter((p) => p.identity in panoramaSettings.keys)
  .map((p) => ({ ...p, apiKey: panoramaSettings.keys[p.identity] }));
