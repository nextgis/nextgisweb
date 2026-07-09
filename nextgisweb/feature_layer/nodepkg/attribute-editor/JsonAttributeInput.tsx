import type { CSSProperties } from "react";

import type { JsonValue } from "@nextgisweb/feature-layer/type";

import { JsonValuePreview } from "../json-value";

export interface JsonAttributeInputProps {
  id?: string;
  style?: CSSProperties;
  value?: JsonValue;
  disabled?: boolean;
  readOnly?: boolean;
  placeholder?: string;
  allowClear?: boolean;
  onChange?: (value: JsonValue) => void;
}

export function JsonAttributeInput({
  id,
  style,
  value,
  disabled,
  readOnly,
  placeholder,
  onChange,
}: JsonAttributeInputProps) {
  return (
    <JsonValuePreview
      id={id}
      input
      value={value}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readOnly}
      style={style}
      onChange={onChange}
    />
  );
}
