import type { FeatureLayerFieldRead } from "@nextgisweb/feature-layer/type/api";

import type {
  AttributeFieldRef,
  FieldOperandExpr,
  FieldRef,
  ResolvedFieldRef,
  VirtualFieldRef,
  VirtualOperandId,
} from "../type";

import {
  VIRTUAL_FIELD_DESCRIPTORS,
  getVirtualFieldDescriptor,
} from "./virtual-fields";

const FIELD_SELECT_PREFIX = "field:";
const VIRTUAL_SELECT_PREFIX = "virtual:";

export function createAttributeFieldRef(keyname: string): AttributeFieldRef {
  return { kind: "field", keyname };
}

export function createVirtualFieldRef(id: VirtualOperandId): VirtualFieldRef {
  return { kind: "virtual", id };
}

export function fieldRefToExpression(fieldRef: FieldRef): FieldOperandExpr {
  if (fieldRef.kind === "field") {
    return ["get", fieldRef.keyname];
  }

  const descriptor = getVirtualFieldDescriptor(fieldRef.id);
  if (!descriptor) {
    throw new Error(`Unknown virtual field: '${fieldRef.id}'`);
  }

  return descriptor.toExpr();
}

export function expressionToFieldRef(
  expression: unknown
): FieldRef | undefined {
  for (const descriptor of VIRTUAL_FIELD_DESCRIPTORS) {
    if (descriptor.matchesExpr(expression)) {
      return createVirtualFieldRef(descriptor.id);
    }
  }

  if (
    Array.isArray(expression) &&
    expression.length === 2 &&
    expression[0] === "get" &&
    typeof expression[1] === "string"
  ) {
    return createAttributeFieldRef(expression[1]);
  }

  return undefined;
}

export function resolveFieldRef(
  fields: FeatureLayerFieldRead[],
  fieldRef: FieldRef
): ResolvedFieldRef | undefined {
  if (fieldRef.kind === "field") {
    const field = fields.find((item) => item.keyname === fieldRef.keyname);
    if (!field) {
      return undefined;
    }

    return {
      ref: fieldRef,
      label: field.display_name,
      datatype: field.datatype,
      isVirtual: false,
    };
  }

  const descriptor = getVirtualFieldDescriptor(fieldRef.id);
  if (!descriptor) {
    return undefined;
  }

  return {
    ref: fieldRef,
    label: descriptor.label,
    datatype: descriptor.datatype,
    isVirtual: true,
  };
}

export function listFieldRefs(
  fields: FeatureLayerFieldRead[]
): ResolvedFieldRef[] {
  return [
    ...fields.map(
      (field): ResolvedFieldRef => ({
        ref: createAttributeFieldRef(field.keyname),
        label: field.display_name,
        datatype: field.datatype,
        isVirtual: false,
      })
    ),
    ...VIRTUAL_FIELD_DESCRIPTORS.map(
      (descriptor): ResolvedFieldRef => ({
        ref: createVirtualFieldRef(descriptor.id),
        label: descriptor.label,
        datatype: descriptor.datatype,
        isVirtual: true,
      })
    ),
  ];
}

export function getDefaultFieldRef(
  fields: FeatureLayerFieldRead[]
): FieldRef | undefined {
  return listFieldRefs(fields)[0]?.ref;
}

export function fieldRefToSelectValue(fieldRef: FieldRef): string {
  return fieldRef.kind === "field"
    ? `${FIELD_SELECT_PREFIX}${fieldRef.keyname}`
    : `${VIRTUAL_SELECT_PREFIX}${fieldRef.id}`;
}

export function selectValueToFieldRef(value: string): FieldRef | undefined {
  if (value.startsWith(FIELD_SELECT_PREFIX)) {
    return createAttributeFieldRef(value.slice(FIELD_SELECT_PREFIX.length));
  }

  if (value.startsWith(VIRTUAL_SELECT_PREFIX)) {
    const id = value.slice(VIRTUAL_SELECT_PREFIX.length) as VirtualOperandId;
    if (getVirtualFieldDescriptor(id)) {
      return createVirtualFieldRef(id);
    }
  }

  return undefined;
}
