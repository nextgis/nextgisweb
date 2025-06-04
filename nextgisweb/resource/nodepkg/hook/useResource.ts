import { useCallback } from "react";

import { useRoute } from "@nextgisweb/pyramid/hook";
import settings from "@nextgisweb/resource/client-settings";
import type { DataScopePermissions } from "@nextgisweb/resource/type/api";

const resourceExportSetting = settings.resource_export;

export function useResource({ id }: { id: number }) {
    const { route } = useRoute("resource.permission", { id });

    const isUserAdministrator = ngwConfig.isAdministrator;

    const isExportAllowed = useCallback(async () => {
        if (isUserAdministrator) {
            return true;
        }
        const data = await route.get<{ data: DataScopePermissions }>();
        if (data) {
            const { read, write } = data.data;
            if (resourceExportSetting === "data_write" && write) {
                return true;
            } else if (resourceExportSetting === "data_read" && read) {
                return true;
            }
        }
        return false;
    }, [route, isUserAdministrator]);

    return { isExportAllowed };
}
