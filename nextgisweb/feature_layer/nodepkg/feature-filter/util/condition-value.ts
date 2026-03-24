import dayjs, { isDayjs } from "dayjs";
import type { Dayjs } from "dayjs";

import type {
  FeatureLayerFieldDatatype,
  FeatureLayerFieldRead,
} from "@nextgisweb/feature-layer/type/api";

import {
  marshalFieldValue,
  unmarshalFieldValue,
} from "../../util/ngwAttributes";
import type {
  FieldRef,
  FilterCondition,
  Operator,
  OperatorValueMap,
} from "../type";

import { resolveFieldRef } from "./field-ref";

type TemporalDatatype = Extract<
  FeatureLayerFieldDatatype,
  "DATE" | "TIME" | "DATETIME"
>;

type ScalarConditionValue = Exclude<
  FilterCondition["value"],
  Array<string | number> | undefined
>;

const INTEGER_RE = /^[+-]?\d+$/;
const TIME_RE = /^\d{2}:\d{2}:\d{2}$/;

function isNullOperator(
  operator: Operator
): operator is "is_null" | "!is_null" {
  return operator === "is_null" || operator === "!is_null";
}

function isListOperator(operator: Operator): operator is "in" | "!in" {
  return operator === "in" || operator === "!in";
}

function isTemporalDatatype(
  datatype: FeatureLayerFieldDatatype
): datatype is TemporalDatatype {
  return ["DATE", "TIME", "DATETIME"].includes(datatype);
}

function hasNonEmptyStringValue(value: ScalarConditionValue): boolean {
  return typeof value !== "string" || value.trim() !== "";
}

function normalizeBigIntString(value: string): string | undefined {
  const trimmedValue = value.trim();
  if (!INTEGER_RE.test(trimmedValue)) return undefined;
  try {
    return BigInt(trimmedValue).toString();
  } catch {
    return undefined;
  }
}

function getTemporalDayjsValue(
  sourceDatatype: FeatureLayerFieldDatatype | undefined,
  targetDatatype: TemporalDatatype,
  value: ScalarConditionValue
): Dayjs | undefined {
  if (
    sourceDatatype &&
    isTemporalDatatype(sourceDatatype) &&
    (typeof value === "string" || typeof value === "number")
  ) {
    const temporalValue = unmarshalFieldValue(sourceDatatype, value);
    if (isDayjs(temporalValue) && temporalValue.isValid()) {
      if (sourceDatatype === "TIME" && targetDatatype !== "TIME") {
        return undefined;
      }
      return temporalValue.utc();
    }
  }

  if (typeof value !== "string") return undefined;

  const trimmedValue = value.trim();
  if (!trimmedValue) return undefined;

  if (targetDatatype === "TIME") {
    if (!TIME_RE.test(trimmedValue)) return undefined;
    const timeValue = dayjs.utc(`1970-01-01T${trimmedValue}`);
    return timeValue.isValid() ? timeValue : undefined;
  }

  const parsedValue = dayjs.utc(trimmedValue);
  return parsedValue.isValid() ? parsedValue : undefined;
}

const CONVERSION_MAP: Partial<
  Record<
    FeatureLayerFieldDatatype,
    (
      val: ScalarConditionValue,
      srcDt?: FeatureLayerFieldDatatype
    ) => string | number | undefined
  >
> = {
  STRING: (val) => {
    if (typeof val === "string") return val;
    if (typeof val === "number")
      return Number.isFinite(val) ? String(val) : undefined;
    if (typeof val === "boolean") return String(val);
    return undefined;
  },
  INTEGER: (val) => {
    const n = typeof val === "string" ? Number(val.trim()) : val;
    return typeof n === "number" && Number.isSafeInteger(n) ? n : undefined;
  },
  REAL: (val) => {
    const n = typeof val === "string" ? Number(val.trim()) : val;
    return typeof n === "number" && Number.isFinite(n) ? n : undefined;
  },
  BIGINT: (val) => {
    if (typeof val === "string") return normalizeBigIntString(val);
    if (typeof val === "number")
      return Number.isSafeInteger(val) ? String(val) : undefined;
    return undefined;
  },
};

function convertScalarValue(
  targetDatatype: FeatureLayerFieldDatatype,
  value: ScalarConditionValue,
  sourceDatatype?: FeatureLayerFieldDatatype
): string | number | undefined {
  if (value === null || value === undefined) return undefined;

  if (isTemporalDatatype(targetDatatype)) {
    const temporalValue = getTemporalDayjsValue(
      sourceDatatype,
      targetDatatype,
      value
    );
    if (!temporalValue) return undefined;
    const marshaled = marshalFieldValue(targetDatatype, temporalValue);
    return typeof marshaled === "string" ? marshaled : undefined;
  }

  const converter = CONVERSION_MAP[targetDatatype];
  return converter ? converter(value, sourceDatatype) : undefined;
}

function getScalarValues(
  operator: Operator,
  value: FilterCondition["value"]
): ScalarConditionValue[] | undefined {
  if (isNullOperator(operator)) return undefined;
  if (value === undefined || value === null) return undefined;

  const isValueArray = Array.isArray(value);

  if (isListOperator(operator)) {
    return isValueArray ? value : [value];
  }

  if (isValueArray) {
    return value.length > 0 ? [value[0]] : undefined;
  }

  return [value];
}

export const getDefaultValue = <O extends keyof OperatorValueMap>(
  fields: FeatureLayerFieldRead[],
  field: FieldRef,
  operator: O
): OperatorValueMap[O] => {
  const fieldInfo = resolveFieldRef(fields, field);
  let defaultValue: any = undefined;

  if (isListOperator(operator)) {
    defaultValue = [];
  } else if (!isNullOperator(operator) && fieldInfo) {
    const now = dayjs.utc();
    switch (fieldInfo.datatype) {
      case "INTEGER":
      case "REAL":
        defaultValue = 0;
        break;
      case "BIGINT":
        defaultValue = "0";
        break;
      case "STRING":
        defaultValue = "";
        break;
      case "DATE":
        defaultValue = now.format("YYYY-MM-DD");
        break;
      case "TIME":
        defaultValue = now.format("HH:mm:ss");
        break;
      case "DATETIME":
        defaultValue = now.format("YYYY-MM-DDTHH:mm:ss");
        break;
      default:
        defaultValue = undefined;
    }
  }

  return defaultValue as OperatorValueMap[O];
};

interface GetMigratedConditionValueOptions<O extends Operator = Operator> {
  fields: FeatureLayerFieldRead[];
  currentField: FieldRef;
  currentOperator: Operator;
  currentValue: FilterCondition["value"];
  nextField: FieldRef;
  nextOperator: O;
}

export function getMigratedConditionValue<O extends Operator>({
  fields,
  currentField,
  currentOperator,
  currentValue,
  nextField,
  nextOperator,
}: GetMigratedConditionValueOptions<O>): OperatorValueMap[O] {
  const defaultValue = getDefaultValue(fields, nextField, nextOperator);
  if (isNullOperator(nextOperator)) {
    return defaultValue;
  }

  const sourceField = resolveFieldRef(fields, currentField);
  const targetField = resolveFieldRef(fields, nextField);
  if (!targetField) return defaultValue;

  const sourceValues = getScalarValues(currentOperator, currentValue)?.filter(
    (value) => !isListOperator(nextOperator) || hasNonEmptyStringValue(value)
  );
  if (!sourceValues || sourceValues.length === 0) return defaultValue;

  const convertedValues = sourceValues
    .map((v) =>
      convertScalarValue(targetField.datatype, v, sourceField?.datatype)
    )
    .filter((v): v is string | number => v !== undefined);

  if (convertedValues.length === 0) return defaultValue;

  if (isListOperator(nextOperator)) {
    return convertedValues as OperatorValueMap[O];
  }

  return convertedValues[0] as OperatorValueMap[O];
}

export function coerceTagValues(
  datatype: FeatureLayerFieldDatatype,
  values: string[]
): Array<string | number> {
  if (datatype === "STRING") return values;

  return values
    .map((v) => convertScalarValue(datatype, v))
    .filter((v): v is string | number => v !== undefined);
}
