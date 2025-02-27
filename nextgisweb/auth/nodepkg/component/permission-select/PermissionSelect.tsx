import { useMemo } from "react";

import type { Permission } from "@nextgisweb/auth/type/api";
import { Select } from "@nextgisweb/gui/antd";
import type { SelectProps } from "@nextgisweb/gui/antd";
import { route } from "@nextgisweb/pyramid/api";

const permission = await route("auth.permission").get({ cache: true });

interface PermissionSelectProps extends SelectProps<Permission> {
    multiple?: boolean;
    value?: Permission;
}

export function PermissionSelect({
    multiple,
    ...restProps
}: PermissionSelectProps) {
    const options = useMemo(
        () =>
            Object.entries(permission).map(([key, value]) => ({
                value: key,
                label: value,
            })),
        []
    );
    return (
        <Select
            mode={multiple ? "multiple" : undefined}
            options={options}
            {...restProps}
        />
    );
}
