/** @registry  */
import type Control from "ol/control/Control";
import type { FC } from "react";

import { pluginRegistry } from "@nextgisweb/jsrealm/plugin";
import type { ImportCallback } from "@nextgisweb/jsrealm/plugin";
import type { TargetPosition } from "@nextgisweb/webmap/control-container/ControlContainer";
import type { ControlProps } from "@nextgisweb/webmap/map-component";
import type { OlControlProps } from "@nextgisweb/webmap/map-component/control/OlControl";

export type MapControlPluginWidget<P> = ImportCallback<FC<ControlProps<P>>>;

export type EmbeddedShowMode = "always" | "customize";

export interface MapControlPlugin<P = any> {
    component: MapControlPluginWidget<P>;
    key: string;
    order?: number;
    props?: ControlProps<P>;
    label?: string;
    position?: TargetPosition;
    hideOnMobile?: boolean;
    embeddedShowMode?: EmbeddedShowMode;
}

export const registry = pluginRegistry<MapControlPlugin>(MODULE_NAME);

export function mapControlRegistry<P>(
    compId: string,
    plugin: MapControlPlugin<P>
) {
    registry.register(compId, plugin as unknown as MapControlPlugin<P>);
}

export async function olControlRegistry<T extends Control>(
    compId: string,
    {
        key,
        ctor,
        ...props
    }: Omit<MapControlPlugin, "component" | "props"> & OlControlProps<T>
) {
    mapControlRegistry(compId, {
        key,
        component: () =>
            import("@nextgisweb/webmap/map-component/control/OlControl"),
        props: { ctor },
        ...props,
    });
}
