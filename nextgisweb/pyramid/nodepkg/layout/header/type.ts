import type { FC } from "react";

import type { ImportCallback } from "@nextgisweb/jsrealm/plugin";

import type { MenuItem } from "../store";

export type HeaderComponent<P = any> = ImportCallback<FC<P>> | MenuItem;
