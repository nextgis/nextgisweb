import { Select } from "antd";

import type { SelectProps } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

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
        { value: 1, label: gettext("True") },
        { value: 0, label: gettext("False") },
      ]}
      allowClear={false}
      {...restSelectProps}
    />
  );
}
