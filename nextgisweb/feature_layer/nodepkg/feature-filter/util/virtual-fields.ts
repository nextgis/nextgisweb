import { gettext } from "@nextgisweb/pyramid/i18n";

import type { VirtualFieldDescriptor, VirtualOperandId } from "../type";

export const VIRTUAL_FID_FIELD_ID = "fid";

export const VIRTUAL_FIELD_DESCRIPTORS: VirtualFieldDescriptor[] = [
  {
    id: VIRTUAL_FID_FIELD_ID,
    label: gettext("Feature ID"),
    datatype: "INTEGER",
    toExpr: () => ["fid"],
    matchesExpr: (expr: unknown): expr is ["fid"] =>
      Array.isArray(expr) && expr.length === 1 && expr[0] === "fid",
  },
];

const VIRTUAL_FIELD_DESCRIPTOR_MAP = new Map(
  VIRTUAL_FIELD_DESCRIPTORS.map((descriptor) => [descriptor.id, descriptor])
);

export function getVirtualFieldDescriptor(
  id: VirtualOperandId
): VirtualFieldDescriptor | undefined {
  return VIRTUAL_FIELD_DESCRIPTOR_MAP.get(id);
}
