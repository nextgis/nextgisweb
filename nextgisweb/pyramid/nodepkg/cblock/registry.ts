/** @registry */

import type { FC } from "react";

import { pluginRegistry } from "@nextgisweb/jsrealm/plugin";

export interface CBlocks {
    // Stub to avoid empty interface
    "stub": undefined;
}

export type CBlockSlot = Exclude<keyof CBlocks, "stub">;

type CBlockPlugin = {
    [K in keyof CBlocks]: CBlocks[K] extends NonNullable<unknown>
        ? { slot: K; func: (payload: CBlocks[K]) => FC<CBlocks[K]> | false }
        : CBlocks[K] extends undefined
          ? { slot: K; func: () => FC | false }
          : never;
}[CBlockSlot];

export const registry = pluginRegistry<CBlockPlugin>(MODULE_NAME);
