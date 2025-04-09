import { useMemo } from "react";

import { Select } from "@nextgisweb/gui/antd";
import type { SelectProps } from "@nextgisweb/gui/antd";
import { useRouteGet } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";

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
        const order = data?.lookup_table?.order;
        if (items) {
            const orderedItemsEntries = order?.map((key: string) => [
                key,
                items[key],
            ]);

            return orderedItemsEntries?.map(([value, label]) => {
                return {
                    value,
                    label,
                };
            });
        }
        return [];
    }, [data]);

    return (
        <Select
            showSearch
            value={isLoading ? undefined : value ? String(value) : undefined}
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
