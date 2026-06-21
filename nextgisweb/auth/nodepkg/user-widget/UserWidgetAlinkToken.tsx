import { useEffect, useMemo, useRef, useState } from "react";

import { Flex, Input, Select } from "@nextgisweb/gui/antd";
import type { InputProps } from "@nextgisweb/gui/antd";
import { assert } from "@nextgisweb/jsrealm/error";
import { gettext } from "@nextgisweb/pyramid/i18n";

const modes = [
  {
    key: "keep" as const,
    model: undefined,
    label: gettext("Keep existing"),
  },
  {
    key: "assign" as const,
    model: true,
    label: gettext("Assign new"),
  },
  {
    key: "turn_off" as const,
    model: false,
    label: gettext("Turn off"),
  },
];

type ModeKey = (typeof modes)[number]["key"];

type UserWidgetAlinkTokenProps = Omit<InputProps, "value" | "onChange"> & {
  value?: boolean | string | null;
  onChange?: (val: boolean | undefined) => void;
};

export function UserWidgetAlinkToken({
  value,
  onChange,
}: UserWidgetAlinkTokenProps) {
  const [state, setState] = useState<[ModeKey, string | null]>(() => {
    if (!value) return ["turn_off", null];
    if (typeof value === "string") return ["keep", value];
    assert(false, "Falsy or string value expected for alink token");
  });

  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const token = state[1];
  useEffect(() => {
    if (token) onChangeRef.current?.(undefined);
  }, [token]);

  const availableModes = useMemo(() => {
    return modes
      .filter((m) => m.key !== "keep" || state[1])
      .map((m) => ({ value: m.key, label: m.label }));
  }, [state]);

  return (
    <Flex gap="medium" align="center">
      <Select
        style={
          state[0] !== "turn_off"
            ? { flexGrow: "0", flexShrink: "0", width: "15em" }
            : undefined
        }
        popupMatchSelectWidth={false}
        value={state[0]}
        options={availableModes}
        onChange={(value) => {
          setState([value, state[1]]);
          const model = modes.find((m) => m.key === value)?.model;
          assert(model !== undefined);
          onChangeRef.current?.(model);
        }}
      />
      {state[0] === "keep" && (
        <Input
          style={{ flexGrow: "1" }}
          value={ngwConfig.applicationUrl + "/alink/" + state[1]}
          readOnly={true}
        />
      )}
      {state[0] === "assign" && (
        <span style={{ flexGrow: "1" }}>
          {gettext("The generated link will be available after saving.")}
        </span>
      )}
    </Flex>
  );
}
