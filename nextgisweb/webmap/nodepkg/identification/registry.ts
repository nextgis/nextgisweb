/** @registry */
import type { FC, LazyExoticComponent } from "react";

import { pluginRegistry } from "@nextgisweb/jsrealm/plugin";

import type { IdentifyExtensionComponentProps } from "../panel/identify/identification";

export const registry =
  pluginRegistry<LazyExoticComponent<FC<IdentifyExtensionComponentProps<any>>>>(
    MODULE_NAME
  );
