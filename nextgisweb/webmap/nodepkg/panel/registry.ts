/** @registry */
import { pluginRegistry } from "@nextgisweb/jsrealm/plugin";

import type { PanelMeta, PanelWidget } from ".";

export const registry = pluginRegistry<PanelWidget, PanelMeta>(MODULE_NAME);
