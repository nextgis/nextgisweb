/** @registry */
import { loaderRegistry } from "@nextgisweb/jsrealm/plugin";

import type { PanelMeta, PanelWidget } from ".";

export const registry = loaderRegistry<PanelWidget, PanelMeta>(MODULE_NAME);
