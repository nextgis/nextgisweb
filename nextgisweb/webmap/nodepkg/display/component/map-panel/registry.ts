/** @registry  */
import type { FC, LazyExoticComponent } from "react";

import { pluginRegistry } from "@nextgisweb/jsrealm/plugin";
import type { TargetPosition } from "@nextgisweb/webmap/control-container/ControlContainer";
import type { Display } from "@nextgisweb/webmap/display";
import type { ControlProps } from "@nextgisweb/webmap/map-component";
import type { MapStore } from "@nextgisweb/webmap/ol/MapStore";

export type MapControlPluginWidget<P> = LazyExoticComponent<
  FC<ControlProps<P>>
>;

export type EmbeddedShowMode = "always" | "customize";

export interface MapControlPlugin<P = any> {
  key: string;
  order?: number;
  label?: string;
  position?: TargetPosition;
  component: MapControlPluginWidget<P>;
  hideOnMobile?: boolean;
  showOnPreview?: boolean;
  previewPosition?: TargetPosition;
  embeddedShowMode?: EmbeddedShowMode;
  isEnabled?: (context: { map: MapStore; display?: Display }) => boolean;
  getProps?: (context: {
    map: MapStore;
    display?: Display;
  }) => Partial<ControlProps<P>> | undefined;
}

export const registry = pluginRegistry<MapControlPlugin>(MODULE_NAME);

export function mapControlRegistry<P>(
  compId: string,
  plugin: MapControlPlugin<P>
) {
  registry.register(compId, plugin as unknown as MapControlPlugin<P>);
}
