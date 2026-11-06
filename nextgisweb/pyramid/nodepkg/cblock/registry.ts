/** @registry */

import type { ReactElement } from "react";

import { pluginRegistry } from "@nextgisweb/jsrealm/plugin";

export interface CBlocks {
  // Stub to avoid empty interface
  "stub": undefined;
}

export type CBlockSlot = Exclude<keyof CBlocks, "stub">;

type CBlockFunc<T> =
  T extends NonNullable<unknown>
    ? (payload: T) => ReactElement | false
    : T extends undefined
      ? () => ReactElement | false
      : never;

type CBlockPlugin = {
  [K in CBlockSlot]: {
    slot: K;
    order?: number;
    func: CBlockFunc<CBlocks[K]>;
  };
}[CBlockSlot];

export const registry = pluginRegistry<CBlockPlugin>(MODULE_NAME, {
  sortKeyFn: (item) => item.order ?? +Infinity,
});
