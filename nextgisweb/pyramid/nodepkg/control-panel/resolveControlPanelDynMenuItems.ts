import type { CustomDynMenuItem } from "../layout/dynmenu/Dynmenu";

import { controlPanelGroups, getControlPanelGroup, registry } from "./registry";
import type {
  ControlPanelGroupId,
  ControlPanelItem,
  LinkControlPanelItem,
} from "./registry";

export function byMenuOrder(a: ControlPanelItem, b: ControlPanelItem) {
  const aOrder = a.menu?.order;
  const bOrder = b.menu?.order;
  if (aOrder !== undefined && bOrder !== undefined) {
    return aOrder - bOrder;
  }

  if (aOrder !== undefined) return -1;
  if (bOrder !== undefined) return 1;

  return a.key.localeCompare(b.key);
}

export async function resolveControlPanelDynMenuItems(
  signal?: AbortSignal
): Promise<CustomDynMenuItem[]> {
  const reg = registry.queryAll();
  const map = new Map<ControlPanelGroupId, LinkControlPanelItem[]>();

  for (const a of reg) {
    if (a.type !== "link") continue;

    const g = a.menu?.group;
    if (!g) continue;

    if (a.condition) {
      const ok = await a.condition({ signal });
      if (!ok) continue;
    }

    const arr = map.get(g) ?? [];
    arr.push(a);
    map.set(g, arr);
  }

  const out: CustomDynMenuItem[] = [];

  const groups = controlPanelGroups();

  for (const { key: g, label } of groups) {
    const arr = (map.get(g) ?? []).slice().sort(byMenuOrder);
    if (!arr.length) continue;

    out.push({
      type: "label",
      label: label ?? getControlPanelGroup(g)?.label ?? g,
      key: [],
    });

    // Prefer exact URL match to avoid selecting both parent and child links.
    const exactSelected = arr.find((item) => location.href === item.href);

    // Fall back to include match for nested routes only if exact match was not found.
    const includeSelected =
      !exactSelected && arr.find((item) => location.href.includes(item.href));

    const selectedItem = exactSelected ?? includeSelected;

    for (const a of arr) {
      out.push({
        type: "link",
        key: [],
        label: a.label ?? a.key,
        url: a.href,
        target: a.target ?? "_self",
        selected: selectedItem === a,
      });
    }
  }

  return out;
}
