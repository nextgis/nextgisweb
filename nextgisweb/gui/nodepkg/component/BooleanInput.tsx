import { Select } from "antd";

import type { SelectProps } from "@nextgisweb/gui/antd";

type BooleanInputProps = Omit<SelectProps, "options">;

export function BooleanInput({
  value,
  disabled,
  onChange,
  ...restSelectProps
}: BooleanInputProps) {
  return (
    <Select
      value={value === null ? undefined : Number(value)}
      disabled={disabled}
      onChange={(val) => onChange?.(Boolean(val))}
      options={[
        { value: 1, label: "true" },
        { value: 0, label: "false" },
      ]}
      allowClear={false}
      {...restSelectProps}
    />
  );
}
