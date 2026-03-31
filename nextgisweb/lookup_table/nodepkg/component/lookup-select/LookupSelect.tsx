import { useMemo } from "react";

import { Select } from "@nextgisweb/gui/antd";
import type { SelectProps } from "@nextgisweb/gui/antd";
import { lookupTableLoadItems } from "@nextgisweb/lookup-table/util/sort";
import { useRouteGet } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";

export type LookupValue = number | string;
type LookupMode = "multiple" | undefined;

type SelectValueByMode<M extends LookupMode> = M extends "multiple"
  ? LookupValue[]
  : LookupValue | undefined;

export interface LookupSelectProps<
  V extends LookupValue = LookupValue,
  M extends LookupMode = undefined,
> extends Omit<SelectProps, "value" | "onChange" | "mode"> {
  lookupId: number;
  mode?: M;
  value?: M extends "multiple" ? V[] : V;
  onChange?: (value: SelectValueByMode<M>, option: unknown) => void;
}

export function LookupSelect<
  V extends LookupValue = LookupValue,
  M extends LookupMode = undefined,
>({
  lookupId,
  value,
  onChange,
  mode,
  ...restSelectProps
}: LookupSelectProps<V, M>) {
  const { data, isLoading } = useRouteGet({
    name: "resource.item",
    params: { id: lookupId },
    options: { cache: true },
  });

  const options = useMemo(() => {
    const lookupTable = data?.lookup_table;
    if (lookupTable) {
      return lookupTableLoadItems(lookupTable).map(({ key, value }) => ({
        value: String(key),
        label: value,
      }));
    }
    return [];
  }, [data]);

  const normalizedValue = useMemo((): SelectValueByMode<M> => {
    if (isLoading) {
      return undefined as SelectValueByMode<M>;
    }

    if (mode === "multiple") {
      return ((value as V[] | undefined)?.map(String) ??
        []) as SelectValueByMode<M>;
    }

    return (
      value !== null && value !== undefined ? String(value) : undefined
    ) as SelectValueByMode<M>;
  }, [isLoading, mode, value]);

  return (
    <Select
      mode={mode}
      showSearch={{ optionFilterProp: "label" }}
      value={normalizedValue}
      onChange={onChange}
      loading={isLoading}
      options={options}
      {...restSelectProps}
      placeholder={
        isLoading ? gettext("Loading...") : restSelectProps.placeholder
      }
      disabled={isLoading}
    />
  );
}
