import { gettext } from "@nextgisweb/pyramid/i18n";

import type {
  FilterCondition as FilterConditionType,
  ResolvedFieldRef,
} from "../type";

function getPlaceholder(
  condition: FilterConditionType,
  defaultPlaceholder: string,
  isValueInputDisabled: boolean
): string {
  if (isValueInputDisabled) {
    return condition.operator === "is_null"
      ? gettext("No value")
      : gettext("Any value");
  }
  return defaultPlaceholder;
}

export function getDefaultPlaceholder(
  condition: FilterConditionType,
  field: ResolvedFieldRef,
  isValueInputDisabled: boolean
): string {
  if (condition.operator === "in" || condition.operator === "!in") {
    return getPlaceholder(
      condition,
      gettext("Enter values and press Enter"),
      isValueInputDisabled
    );
  }

  switch (field.datatype) {
    case "INTEGER":
      return getPlaceholder(
        condition,
        gettext("Enter integer"),
        isValueInputDisabled
      );
    case "BIGINT":
      return getPlaceholder(
        condition,
        gettext("Enter big integer"),
        isValueInputDisabled
      );
    case "REAL":
      return getPlaceholder(
        condition,
        gettext("Enter number"),
        isValueInputDisabled
      );
    case "DATE":
      return getPlaceholder(
        condition,
        gettext("Select date"),
        isValueInputDisabled
      );
    case "TIME":
      return getPlaceholder(
        condition,
        gettext("Select time"),
        isValueInputDisabled
      );
    case "DATETIME":
      return getPlaceholder(
        condition,
        gettext("Select date and time"),
        isValueInputDisabled
      );
    default:
      return getPlaceholder(
        condition,
        gettext("Enter value"),
        isValueInputDisabled
      );
  }
}
