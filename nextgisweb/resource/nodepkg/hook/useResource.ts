import { useMemo } from "react";

import { useRouteGet } from "@nextgisweb/pyramid/hook/useRouteGet";

import settings from "@nextgisweb/pyramid/settings!resource";

import type { Permission } from "../type/Permission";

const resourceExportSetting = settings.resource_export;

export function useResource({ id }: { id: number }) {
    const { data } = useRouteGet<Permission, "resource.permission">(
        "resource.permission",
        { id }
    );

    const isUserAdministrator = ngwConfig.isAdministrator;

    const isExportAllowed = useMemo(() => {
        if (isUserAdministrator) {
            return true;
        }
        if (data) {
            const { read, write } = data.data;
            if (resourceExportSetting === "data_write" && write) {
                return true;
            } else if (resourceExportSetting === "data_read" && read) {
                return true;
            }
        }
        return false;
    }, [data, isUserAdministrator]);

    return { isExportAllowed };
}
