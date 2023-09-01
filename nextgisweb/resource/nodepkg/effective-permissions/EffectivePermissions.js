import { Fragment, useEffect, useMemo, useState } from "react";

import { PrincipalSelect } from "@nextgisweb/auth/component";
import { LoadingWrapper } from "@nextgisweb/gui/component";
import { useRouteGet } from "@nextgisweb/pyramid/hook/useRouteGet";
import { gettext } from "@nextgisweb/pyramid/i18n";

import "./EffectivePermissions.less";

const pvLabel = [gettext("No"), gettext("Yes")];
const pvClass = ["value no", "value yes"];

const isCurrent = (userId) => userId === ngwConfig.userId;

function useLoadData({ resourceId, userId }) {
    const { data: schema } = useRouteGet("resource.blueprint");
    const { data: effective } = useRouteGet({
        name: "resource.permission",
        params: { id: resourceId },
        options: { query: !isCurrent(userId) ? { user: userId } : undefined },
    });
    const [seeOthers, setSeeOthers] = useState(null);

    useEffect(() => {
        if (effective && isCurrent(userId)) {
            setSeeOthers(effective.resource.change_permissions);
        }
    }, [userId, effective]);

    return useMemo(() => {
        if (!effective || seeOthers === null || !schema) return [null, false];

        const result = [];

        for (const [sid, scope] of Object.entries(schema.scopes)) {
            const pd = effective[sid];
            if (pd === undefined) continue;

            const sub = [];
            const itm = { key: sid, label: scope.label, items: sub };

            for (const [pid, pdesc] of Object.entries(scope.permissions)) {
                sub.push({
                    key: pid,
                    label: pdesc.label,
                    value: effective[sid][pid],
                });
            }

            result.push(itm);
        }

        return [result, seeOthers];
    }, [effective, schema, seeOthers]);
}

export function EffectivePermissions({ resourceId }) {
    const [userId, setUserId] = useState(ngwConfig.userId);
    const [data, seeOthers] = useLoadData({ resourceId, userId });

    if (!data) return <LoadingWrapper />;

    return (
        <div className="ngw-resource-effective-permisssions ">
            <PrincipalSelect
                model="user"
                value={userId}
                onChange={setUserId}
                systemUsers={["guest"]}
                disabled={!seeOthers}
                allowClear={false}
            />
            <table className="pure-table pure-table-horizontal ngw-card">
                <tbody>
                    {data.map(({ key, label, items }) => (
                        <Fragment key={key}>
                            <tr>
                                <th colSpan={2}>{label}</th>
                            </tr>
                            {items.map(({ key, label, value }) => (
                                <tr key={key} className="permission">
                                    <td className="label">{label}</td>
                                    <td className={pvClass[Number(value)]}>
                                        <div>{pvLabel[Number(value)]}</div>
                                    </td>
                                </tr>
                            ))}
                        </Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    );
}
