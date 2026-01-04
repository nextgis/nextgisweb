import { useMemo } from "react";

import { useRouteGet } from "@nextgisweb/pyramid/hook/useRouteGet";
import settings from "@nextgisweb/resource/client-settings";
import type { DataScopePermissions } from "@nextgisweb/resource/type/api";

const { resourceExport } = settings;

export function useResource({ id }: { id: number }) {
    const { data } = useRouteGet<{ data: DataScopePermissions }>(
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
            if (resourceExport === "data_write" && write) {
                return true;
            } else if (resourceExport === "data_read" && read) {
                return true;
            }
        }
        return false;
    }, [data, isUserAdministrator]);

    return { isExportAllowed };
}
