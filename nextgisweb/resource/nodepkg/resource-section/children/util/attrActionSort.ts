import type { RenderResourceAction } from "../type";

export function compareOptionalOrder(
  aOrder: number | undefined,
  bOrder: number | undefined,
  aKey: string,
  bKey: string
) {
  if (aOrder !== undefined && bOrder !== undefined) {
    return aOrder - bOrder;
  }

  if (aOrder !== undefined) return -1;
  if (bOrder !== undefined) return 1;

  return aKey.localeCompare(bKey);
}

export function byQuickOrder(a: RenderResourceAction, b: RenderResourceAction) {
  const aOrder =
    typeof a.quick === "object" && a.quick !== undefined
      ? a.quick.order
      : undefined;
  const bOrder =
    typeof b.quick === "object" && b.quick !== undefined
      ? b.quick.order
      : undefined;

  return compareOptionalOrder(aOrder, bOrder, a.key, b.key);
}

export function byMenuOrder(a: RenderResourceAction, b: RenderResourceAction) {
  return compareOptionalOrder(a.menu?.order, b.menu?.order, a.key, b.key);
}
