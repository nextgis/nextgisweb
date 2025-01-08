/** @registry */
import type { FC } from "react";

import { pluginRegistry } from "@nextgisweb/jsrealm/plugin";

import type { IdentifyExtensionComponentProps } from "../panel/identification/identification";

export const registry =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    pluginRegistry<FC<IdentifyExtensionComponentProps<any>>>(MODULE_NAME);
