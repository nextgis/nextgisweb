import type { ComponentProps, ReactNode } from "react";

import { Radio } from "../antd";

const RadioGroup = Radio.Group;

export interface ModeSelectorProps<T extends string> extends Omit<
  ComponentProps<typeof RadioGroup>,
  "value" | "options" | "onChange"
> {
  value?: T;
  options?: { value: T; label: ReactNode }[];
  onChange?: (value: T) => void;
}

export function ModeSelector<T extends string>({
  value,
  options,
  onChange,
  ...props
}: ModeSelectorProps<T>) {
  return (
    <RadioGroup
      vertical={true}
      value={value}
      options={options}
      onChange={(e) => onChange?.(e.target.value)}
      {...props}
    />
  );
}
