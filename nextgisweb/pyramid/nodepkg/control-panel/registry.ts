/** @registry */

import { pluginRegistry } from "@nextgisweb/jsrealm/plugin";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { DynMenuItem } from "../layout/type";

interface ControlPanelItemBase extends DynMenuItem<ControlPanelGroupId> {
  type: string;
  label: string;
  condition?: ({
    signal,
  }: {
    signal?: AbortSignal;
  }) => boolean | Promise<boolean>;
}

export interface LinkControlPanelItem extends ControlPanelItemBase {
  type: "link";
  href: string;
  target?: "_blank" | "_self";
}

export interface ActionControlPanelItem extends ControlPanelItemBase {
  type: "action";
  action: () => void | Promise<void>;
}

export type ControlPanelItem = LinkControlPanelItem | ActionControlPanelItem;

export const registry = pluginRegistry<ControlPanelItem>(MODULE_NAME);

export function registerControlPanelItem(
  compId: string,
  item: ControlPanelItem
) {
  registry.register(compId, item);
}

/**
 * Extensible action group ids
 *
 * @example
 *
 * declare module "@nextgisweb/pyramid/control-panel/registry" {
 *   interface ControlPanelGroupIdMap {
 *     extra: true;
 *   }
 * }
 */
export interface ControlPanelGroupIdMap {
  info: true;
  settings: true;
}

export type ControlPanelGroupId = keyof ControlPanelGroupIdMap;

export interface ControlPanelGroupDef {
  key: ControlPanelGroupId;
  order: number;
  label: string;
}

const groups = new Map<ControlPanelGroupId, ControlPanelGroupDef>();

export function registerControlPanelGroup(group: ControlPanelGroupDef) {
  const existed = groups.get(group.key);
  if (!existed) {
    groups.set(group.key, group);
    return;
  }
}

export function getControlPanelGroup(key: ControlPanelGroupId) {
  return groups.get(key);
}

export function controlPanelGroups() {
  return [...groups.values()].sort((a, b) => a.order - b.order);
}

registerControlPanelGroup({
  key: "info",
  order: 100,
  label: gettext("Info"),
});
registerControlPanelGroup({
  key: "settings",
  order: 200,
  label: gettext("Settings"),
});
