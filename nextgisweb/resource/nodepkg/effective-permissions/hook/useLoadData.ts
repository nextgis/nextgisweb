import { useEffect, useState } from "react";

import { useRouteGet } from "@nextgisweb/pyramid/hook/useRouteGet";
import type { EffectivePermissions } from "@nextgisweb/resource/type/api";

import type { PermissionData, PermissionDataItem } from "../type";

interface UseLoadDataProps {
    resourceId: number;
    userId: number;
}

const isCurrent = (userId: number) => userId === ngwConfig.userId;

export function useLoadData({
    resourceId,
    userId,
}: UseLoadDataProps): [PermissionData[] | null, boolean] {
    const { data: schema } = useRouteGet("resource.blueprint");

    const { data: effective } = useRouteGet({
        name: "resource.permission",
        params: { id: resourceId },
        options: { query: !isCurrent(userId) ? { user: userId } : undefined },
    });

    const [seeOthers, setSeeOthers] = useState<boolean | null>(null);

    useEffect(() => {
        if (effective && isCurrent(userId)) {
            setSeeOthers(effective.resource.change_permissions);
        }
    }, [userId, effective]);

    if (!effective || seeOthers === null || !schema) return [null, false];

    const result: PermissionData[] = [];

    for (const [sid, scope] of Object.entries(schema.scopes)) {
        const pd = effective[sid as keyof EffectivePermissions];
        if (pd === undefined) continue;

        const sub: PermissionDataItem[] = [];
        const itm: PermissionData = {
            key: sid,
            label: scope.label,
            items: sub,
        };

        for (const [pid, pdesc] of Object.entries(scope.permissions)) {
            sub.push({
                key: pid,
                label: pdesc.label,
                value: pd[pid as keyof typeof pd],
            });
        }

        result.push(itm);
    }

    return [result, seeOthers];
}
