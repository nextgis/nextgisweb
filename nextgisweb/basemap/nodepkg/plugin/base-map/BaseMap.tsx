import { lazy } from "react";

import { PluginBase } from "@nextgisweb/webmap/plugin/PluginBase";

const BasemapLayersLazy = lazy(() => import("./BasemapLayers"));

export class BaseMap extends PluginBase {
  renderMap = BasemapLayersLazy;
}
