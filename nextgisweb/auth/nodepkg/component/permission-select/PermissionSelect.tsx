import { useMemo } from "react";

import type { Permission } from "@nextgisweb/auth/type/api";
import { Select } from "@nextgisweb/gui/antd";
import type { SelectProps } from "@nextgisweb/gui/antd";
import permission from "@nextgisweb/pyramid/api/load!/api/component/auth/permission";

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
