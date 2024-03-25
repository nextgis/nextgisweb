import { useMemo } from "react";

import { Select } from "@nextgisweb/gui/antd";
import type { SelectProps } from "@nextgisweb/gui/antd";
import { useRouteGet } from "@nextgisweb/pyramid/hook";

export interface LookupSelectProps<V extends number = number>
    extends SelectProps {
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
        const items = data?.lookup_table?.items;
        if (items) {
            return Object.entries(items)
                .map(([value, label]) => {
                    return {
                        value,
                        label,
                    };
                })
                .sort((a, b) => a.label.localeCompare(b.label));
        }
        return [];
    }, [data]);

    return (
        <Select
            showSearch
            value={value}
            onChange={onChange}
            optionFilterProp="label"
            loading={isLoading}
            allowClear
            options={options}
            {...restSelectProps}
        ></Select>
    );
}
