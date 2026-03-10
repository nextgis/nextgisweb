/** @registry */

import type React from "react";
import type { FC, LazyExoticComponent } from "react";

import type { useShowModal } from "@nextgisweb/gui";
import type { message } from "@nextgisweb/gui/antd";
import { pluginRegistry } from "@nextgisweb/jsrealm/plugin";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type { ResourceAttrItem } from "@nextgisweb/resource/api/ResourceAttrItem";
import type { Attributes } from "@nextgisweb/resource/api/resource-attr";

import type {
  DefaultResourceAttrItem,
  DefaultResourceSectionAttrs,
} from "./type";

export type ResourceActionWidgetProps<P = unknown> = P &
  Pick<ResourceAction, "label" | "icon"> & {
    item: ResourceAttrItem;
    source: React.ReactElement;
    setAttrItems?: React.Dispatch<
      React.SetStateAction<DefaultResourceAttrItem[]>
    >;
  };

export type ResourceActionWidget<P = unknown> = LazyExoticComponent<
  FC<ResourceActionWidgetProps<P>>
>;

type CustomResourceAttrItem<A extends Attributes = Attributes> =
  ResourceAttrItem<[...typeof DefaultResourceSectionAttrs, ...A]>;

type ShowModalFn = ReturnType<typeof useShowModal>["showModal"];
type MessageInstance = ReturnType<typeof message.useMessage>[0];

interface RunOptions<A extends Attributes = Attributes> {
  item: CustomResourceAttrItem<A>;
  signal: AbortSignal;
  messageApi: MessageInstance;
  setAttrItems?: React.Dispatch<
    React.SetStateAction<DefaultResourceAttrItem[]>
  >;
  showModal: ShowModalFn;
  attributes: [...typeof DefaultResourceSectionAttrs];
}

export interface ResourceAction<
  P = unknown,
  A extends Attributes = Attributes,
> {
  key: string;
  href?: string | ((opt: CustomResourceAttrItem<A>) => string);
  icon?: React.ReactNode;
  props?: P;
  label?: string;
  target?: "_self" | "_blank";
  widget?: ResourceActionWidget<P>;
  attributes?: [...A];
  icon_suffix?: React.ReactNode;
  hideOnMobile?: boolean;
  menu?: { order?: number; group: ResourceActionGroupId };
  quick?: { order?: number } | boolean;
  run?: (opt: RunOptions<A>) => void;
  condition?: (opt: CustomResourceAttrItem<A>) => boolean;
}

export const registry = pluginRegistry<ResourceAction>(MODULE_NAME);

export function registerResourceAction<P, A extends Attributes>(
  compId: string,
  action: ResourceAction<P, A>
) {
  registry.register(compId, action as unknown as ResourceAction);
}

/**
 * Extensible action group ids
 *
 * @example
 * import type "@nextgisweb/resource/resource-section/registry";
 *
 * declare module "@nextgisweb/resource/resource-section/registry" {
 *   interface ResourceActionGroupIdMap {
 *     extra: true;
 *   }
 * }
 */
export interface ResourceActionGroupIdMap {
  extra: true;
  resource: true;
}

export type ResourceActionGroupId = keyof ResourceActionGroupIdMap;
// | (string & {}); // for not so strict way

export interface ResourceActionGroupDef {
  key: ResourceActionGroupId;
  order: number;
  label: string;
}

const groups = new Map<ResourceActionGroupId, ResourceActionGroupDef>();

export function registerResourceActionGroup(group: ResourceActionGroupDef) {
  const existed = groups.get(group.key);
  if (!existed) {
    groups.set(group.key, group);
    return;
  }
}

export function getResourceActionGroup(key: ResourceActionGroupId) {
  return groups.get(key);
}

export function resourceActionGroups() {
  return [...groups.values()].sort((a, b) => a.order - b.order);
}

registerResourceActionGroup({
  key: "resource",
  order: 0,
  label: gettext("Resource"),
});
registerResourceActionGroup({
  key: "extra",
  order: 100,
  label: gettext("Extra"),
});
