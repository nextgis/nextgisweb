import type { Dayjs } from "dayjs";
import type { ReactElement } from "react";

import {
  DatePicker,
  DateTimePicker,
  InputBigInteger,
  InputInteger,
  InputNumber,
  InputValue,
  Select,
  TimePicker,
} from "@nextgisweb/gui/antd";
import { BooleanInput } from "@nextgisweb/gui/component/BooleanInput";

import type { Operator, ResolvedFieldRef } from "../type";
import { coerceTagValues } from "../util/condition-value";

import type { ValueInput } from "./FilterCondition";

export interface DefaultFilterValueInputProps {
  field: ResolvedFieldRef;
  operator: Operator;
  value: unknown;
  disabled: boolean;
  placeholder?: string;
  onChange: (value: ValueInput) => void;
}

export function DefaultFilterValueInput({
  field,
  value,
  operator,
  disabled,
  placeholder,
  onChange,
}: DefaultFilterValueInputProps): ReactElement {
  if (operator === "in" || operator === "!in") {
    const handleTagChange = (values: string[]) => {
      onChange(coerceTagValues(field.datatype, values));
    };

    const normalizedValue = ((value as Array<string | number>) || []).map(
      String
    );

    return (
      <Select
        mode="tags"
        value={normalizedValue}
        onChange={handleTagChange}
        style={{ width: "100%" }}
        placeholder={placeholder}
        tokenSeparators={[","]}
        disabled={disabled}
      />
    );
  }

  const handleDateLikeChange = (nextValue: Dayjs | Dayjs[] | null) => {
    onChange(Array.isArray(nextValue) ? null : nextValue);
  };

  switch (field.datatype) {
    case "INTEGER":
      return (
        <InputInteger
          value={value as number}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
        />
      );

    case "BIGINT":
      return (
        <InputBigInteger
          value={value as string}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
        />
      );

    case "REAL":
      return (
        <InputNumber
          value={value as number}
          onChange={onChange}
          step={0.01}
          placeholder={placeholder}
          disabled={disabled}
        />
      );

    case "DATE":
      return (
        <DatePicker
          value={value as Dayjs}
          onChange={handleDateLikeChange}
          placeholder={placeholder}
          disabled={disabled}
        />
      );

    case "TIME":
      return (
        <TimePicker
          value={value as Dayjs}
          onChange={handleDateLikeChange}
          placeholder={placeholder}
          disabled={disabled}
        />
      );

    case "DATETIME":
      return (
        <DateTimePicker
          value={value as Dayjs}
          onChange={handleDateLikeChange}
          placeholder={placeholder}
          disabled={disabled}
        />
      );
    case "BOOLEAN":
      return (
        <BooleanInput
          style={{ width: "100%" }}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
        />
      );

    default:
      return (
        <InputValue
          value={value as string}
          onChange={onChange}
          placeholder={placeholder}
          disabled={disabled}
        />
      );
  }
}
