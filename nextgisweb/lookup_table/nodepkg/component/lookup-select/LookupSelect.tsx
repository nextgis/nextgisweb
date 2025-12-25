import { useMemo } from "react";

import { Select } from "@nextgisweb/gui/antd";
import type { SelectProps } from "@nextgisweb/gui/antd";
import { lookupTableLoadItems } from "@nextgisweb/lookup-table/util/sort";
import { useRouteGet } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";

export interface LookupSelectProps<
    V extends number = number,
> extends SelectProps {
    value?: V;
    lookupId: number;
}

export function LookupSelect({
    lookupId,
    onChange,
    value,
    ...restSelectProps
}: LookupSelectProps) {
    const { data, isLoading } = useRouteGet({
        name: "resource.item",
        params: { id: lookupId },
        options: { cache: true },
    });

    const options = useMemo(() => {
        const lookupTable = data?.lookup_table;
        if (lookupTable) {
            return lookupTableLoadItems(lookupTable).map(({ key, value }) => {
                return { value: key, label: value };
            });
        }
        return [];
    }, [data]);

    return (
        <Select
            showSearch
            value={
                isLoading
                    ? undefined
                    : value !== null && value !== undefined
                      ? String(value)
                      : undefined
            }
            onChange={onChange}
            optionFilterProp="label"
            loading={isLoading}
            allowClear
            options={options}
            {...restSelectProps}
            placeholder={
                isLoading ? gettext("Loading...") : restSelectProps.placeholder
            }
            disabled={isLoading}
        />
    );
}
