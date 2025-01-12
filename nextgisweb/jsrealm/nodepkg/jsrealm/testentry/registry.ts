/** @registry */
import { pluginRegistry } from "../plugin";

import type { DriverValue } from "./driver/index.inc";

type DriverIdentity = keyof DriverValue;
type Testentry = { identity: string } & {
    [I in DriverIdentity]-?: { driver: I; value: DriverValue[I] };
}[DriverIdentity];

/** Registry of testentries */
export const registry = pluginRegistry<Testentry>(MODULE_NAME);
