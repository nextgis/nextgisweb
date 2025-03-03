/** @registry */
import type { FC } from "react";

import { pluginRegistry } from "@nextgisweb/jsrealm/plugin";
import type { ImportCallback } from "@nextgisweb/jsrealm/plugin";

import type { IdentifyExtensionComponentProps } from "../panel/identify/identification";

export const registry =
    pluginRegistry<ImportCallback<FC<IdentifyExtensionComponentProps<any>>>>(
        MODULE_NAME
    );
