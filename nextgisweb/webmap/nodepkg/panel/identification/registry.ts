/** @registry */
import type { FC } from "react";

import { pluginRegistry } from "@nextgisweb/jsrealm/plugin";

import type { IdentifyExtensionComponentProps } from "./identification";

export const registry =
    pluginRegistry<FC<IdentifyExtensionComponentProps>>(MODULE_NAME);
