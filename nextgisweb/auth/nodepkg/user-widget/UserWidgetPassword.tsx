import { useMemo, useState } from "react";
import type { ChangeEvent, ComponentProps } from "react";

import { Flex, Input, Select } from "@nextgisweb/gui/antd";
import { pgettext, pgettextf } from "@nextgisweb/pyramid/i18n";

import oauth from "../oauth";

const modes = [
  {
    label: pgettext("password_mode", "Keep existing"),
    value: "keep",
  },
  {
    label: pgettext("password_mode", "Assign new"),
    value: "assign",
  },
  {
    label: oauth.enabled
      ? pgettextf("password_mode", "{name} only")({ name: oauth.name })
      : pgettext("password_mode", "Turn off"),
    value: "turn_off",
  },
];

type Mode = "keep" | "assign" | "turn_off";
type PasswordInputProps = ComponentProps<typeof Input.Password>;

type InputProps = Omit<PasswordInputProps, "value" | "onChange"> & {
  value?: boolean | string;
  onChange?: (val: string | boolean) => void;
};

export const UserWidgetPassword = ({
  value,
  onChange,
  ...inputProps
}: InputProps) => {
  const [mode, setMode] = useState<Mode>(value === false ? "turn_off" : "keep");
  const [password, setPassword] = useState<boolean | string>(
    mode === "assign" ? (value ?? "") : ""
  );

  const onModeChange = (nextMode: Mode) => {
    setMode(nextMode);
    if (!onChange) return;

    if (nextMode === "assign") {
      onChange(password);
    } else if (nextMode === "keep") {
      onChange(true);
    } else {
      onChange(false);
    }
  };

  const onPasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    const v = e.target.value;
    setPassword(v);
    if (mode === "assign") {
      onChange?.(v);
    }
  };

  // Hide "keep" item if password wasn't assigned.
  const availableModes = useMemo(() => {
    return modes.filter((m) => value !== false || m.value !== "keep");
  }, [value]);

  return (
    <Flex gap="medium" align="center">
      <Select
        style={
          mode === "assign"
            ? { flexGrow: "0", flexShrink: "0", width: "20em" }
            : undefined
        }
        popupMatchSelectWidth={false}
        value={mode}
        onChange={onModeChange}
      >
        {availableModes.map((m) => (
          <Select.Option key={m.value} value={m.value}>
            {m.label}
          </Select.Option>
        ))}
      </Select>
      {mode === "assign" && (
        <Input.Password
          style={{ flexGrow: "1" }}
          value={mode === "assign" ? String(password) : ""}
          disabled={mode !== "assign"}
          onChange={onPasswordChange}
          {...inputProps}
        />
      )}
    </Flex>
  );
};
