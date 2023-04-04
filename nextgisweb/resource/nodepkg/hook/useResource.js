import { useMemo } from "react";

import { useRouteGet } from "@nextgisweb/pyramid/hook/useRouteGet";

import settings from "@nextgisweb/pyramid/settings!resource";

/**
 * @type {'administrators'|'data_read'|'data_write'}
 */
const resourceExportSetting = settings.resource_export;

export function useResource({ id }) {
    const { data } = useRouteGet("resource.permission", { id });

    const isUserAdministrator = window.ngwConfig.isAdministrator;

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
