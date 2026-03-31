import { InputValue } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { NgwAttributeType } from "../../type";
import { unmarshalFieldValue } from "../../util/ngwAttributes";
import type {
  FilterCondition as FilterConditionType,
  FilterValueWidgetComponent,
  ResolvedFieldRef,
} from "../type";
import { getDefaultPlaceholder } from "../util/placeholder";

import { DefaultFilterValueInput } from "./DefaultFilterValueInput";
import type { ValueInput } from "./FilterCondition";

const isNullOperator = (operator: FilterConditionType["operator"]) =>
  operator === "is_null" || operator === "!is_null";

const calculateValue = (
  condition: FilterConditionType,
  field: ResolvedFieldRef
): NgwAttributeType => {
  const isValueNullable =
    condition.value === undefined || condition.value === null;
  const conditionValue = isValueNullable
    ? field.datatype === "STRING"
      ? ""
      : null
    : condition.value;
  return conditionValue as NgwAttributeType;
};

const msgNoValue = gettext("No value");
const msgAnyValue = gettext("Any value");
const msgInvalidField = gettext("Invalid field");
const msgFieldNotFound = gettext("Field not found");

interface FilterValueInputProps {
  condition: FilterConditionType;
  field?: ResolvedFieldRef;
  valueWidget?: FilterValueWidgetComponent;
  onChange: (val: ValueInput) => void;
}

export function FilterValueInput({
  field,
  condition,
  valueWidget,
  onChange,
}: FilterValueInputProps) {
  const isValueInputDisabled = isNullOperator(condition.operator);
  if (!field) {
    return (
      <InputValue
        value={msgInvalidField}
        placeholder={msgFieldNotFound}
        disabled={true}
        status="error"
      />
    );
  }

  if (isValueInputDisabled) {
    return (
      <InputValue
        value={condition.operator === "is_null" ? msgNoValue : msgAnyValue}
        readOnly={true}
      />
    );
  }

  const conditionValue = calculateValue(condition, field);
  const displayValue = unmarshalFieldValue(field.datatype, conditionValue);

  const placeholder = getDefaultPlaceholder(
    condition,
    field,
    isValueInputDisabled
  );

  const ValueWidget = valueWidget;

  if (ValueWidget) {
    return (
      <ValueWidget
        field={field}
        operator={condition.operator}
        value={displayValue}
        disabled={isValueInputDisabled}
        placeholder={placeholder}
        onChange={onChange}
      />
    );
  }

  return (
    <DefaultFilterValueInput
      field={field}
      operator={condition.operator}
      value={displayValue}
      disabled={isValueInputDisabled}
      placeholder={placeholder}
      onChange={onChange}
    />
  );
}
