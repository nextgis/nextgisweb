import { Fragment, useEffect, useMemo, useState } from "react";

import { PrincipalSelect } from "@nextgisweb/auth/component";
import { LoadingWrapper } from "@nextgisweb/gui/component";
import { route } from "@nextgisweb/pyramid/api";
import { useRouteGet } from "@nextgisweb/pyramid/hook/useRouteGet";

import i18n from "@nextgisweb/pyramid/i18n";

import "./EffectivePermissions.less";

const pvLabel = { [true]: i18n.gettext("Yes"), [false]: i18n.gettext("No") };
const pvClass = { [true]: "value yes", [false]: "value no" };

const isCurrent = (userId) => userId === ngwConfig.userId;

function useLoadData({ resourceId, userId }) {
    const { data: schema } = useRouteGet("resource.blueprint");
    const [effective, setEffective] = useState(null);
    const [seeOthers, setSeeOthers] = useState(null);

    useEffect(() => {
        route("resource.permission", resourceId)
            .get({ query: !isCurrent(userId) ? { user: userId } : undefined })
            .then(setEffective);
    }, [resourceId, userId]);

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
        <div className="ngw-resource-effective-permisssions content-box">
            <PrincipalSelect
                model="user"
                value={userId}
                onChange={setUserId}
                systemUsers={["guest"]}
                disabled={!seeOthers}
                allowClear={false}
            />
            <div className="table-wrapper">
                <table className="pure-table pure-table-horizontal">
                    <tbody>
                        {data.map(({ key, label, items }) => (
                            <Fragment key={key}>
                                <tr>
                                    <th colSpan={2}>{label}</th>
                                </tr>
                                {items.map(({ key, label, value }) => (
                                    <tr key={key} className="permission">
                                        <td className="label">{label}</td>
                                        <td className={pvClass[value]}>
                                            <div>{pvLabel[value]}</div>
                                        </td>
                                    </tr>
                                ))}
                            </Fragment>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
