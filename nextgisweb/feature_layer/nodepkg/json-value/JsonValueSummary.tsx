import { useCallback, useMemo } from "react";
import type { CSSProperties } from "react";

import type { JsonValue } from "@nextgisweb/feature-layer/type";
import { Input } from "@nextgisweb/gui/antd";
import { ExpandableText } from "@nextgisweb/gui/index";

import DataObjectIcon from "@nextgisweb/icon/material/data_object";

function getJsonValueSummary(value: JsonValue | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }

  return JSON.stringify(value);
}

interface JsonValueSummaryProps {
  id?: string;
  style?: CSSProperties;
  value?: JsonValue;
  isInput?: boolean;
  disabled?: boolean;
  placeholder?: string;
  onOpen?: () => void;
}

export function JsonValueSummary({
  id,
  value,
  isInput,
  disabled,
  placeholder,
  onOpen,
}: JsonValueSummaryProps) {
  const summary = useMemo(() => getJsonValueSummary(value), [value]);

  const open = useCallback(() => {
    if (!disabled) {
      onOpen?.();
    }
  }, [disabled, onOpen]);

  if (isInput) {
    return (
      <Input
        id={id}
        readOnly
        className="ngw-feature-layer-json-value-input"
        value={summary}
        disabled={disabled}
        placeholder={placeholder}
        suffix={
          <div onClick={open}>
            <DataObjectIcon />
          </div>
        }
        onClick={open}
      />
    );
  }

  return (
    <ExpandableText
      button={true}
      tooltip={true}
      onClick={open}
      symbol={<DataObjectIcon />}
    >
      {summary}
    </ExpandableText>
  );
}
