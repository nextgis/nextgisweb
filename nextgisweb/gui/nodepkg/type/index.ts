import type { FC } from "react";

/**
 * @example
 * ```typescript
 * import { Tabs } from "@nextgisweb/gui/antd";
 * import type { ParamOf } from "@nextgisweb/gui/type";
 *
 * type TabParams = ParamOf<typeof Tabs>;
 * type TabItem = TabItems["items"][0];
 *
 * const newWidget: TabItem = {};
 * ```
 */
export type ParamsOf<T extends FC> = Parameters<T>[0];

/**
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
export type ParamOf<T extends FC, K extends keyof ParamsOf<T>> = ParamsOf<T>[K];
