import type { ComponentProps, FC } from "react";

/**
 * @deprecated Use ComponentProps<T>[K] instead
 *
 * @example
 * ```typescript
 * import { Tabs } from "@nextgisweb/gui/antd";
 * import type { ParamOf } from "@nextgisweb/gui/type";
 *
 * type TabItems = ParamOf<typeof Tabs, "items">;
 * type TabItem = TabItems[0];
 *
 * const newWidget: TabItem = {};
 * ```
 */
export type ParamOf<
  T extends FC,
  K extends keyof ComponentProps<T>,
> = ComponentProps<T>[K];

/**
 * Make all or specified (`P`) properties of `T` nullable
 *
 * @template T - Original type
 * @template P - Keys in `T` to make nullable, defaults to all keys
 */
export type NullableProps<T, P extends keyof T = keyof T> = {
  [K in keyof T]: T[K] | (K extends P ? null : never);
};
