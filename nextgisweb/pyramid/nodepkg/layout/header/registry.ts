/** @registry */

import { pluginRegistry } from "@nextgisweb/jsrealm/plugin";

import type { HeaderProps } from "./Header";
import type { HeaderComponent } from "./type";

export interface HeaderPlugin<P = any> {
    component: HeaderComponent<P>;
    props?: P;
    order?: number;
    menuItem?: boolean;
    isEnabled?: (props: HeaderProps) => boolean;
}

export const registry = pluginRegistry<HeaderPlugin<any>>(MODULE_NAME);

export function headerRegistry<P = any>(
    compId: string,
    plugin: HeaderPlugin<P>
) {
    registry.register(compId, plugin as unknown as HeaderPlugin<P>);
}
