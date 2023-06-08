import { Fragment, useMemo } from "react";
import { useRouteGet } from "@nextgisweb/pyramid/hook/useRouteGet";
import { LoadingWrapper } from "@nextgisweb/gui/component";
import i18n from "@nextgisweb/pyramid/i18n!resource";

import "./EffectivePermissions.less";

const pvLabel = {
    [true]: i18n.gettext("Yes"),
    [false]: i18n.gettext("No"),
};

const pvClass = {
    [true]: "value yes",
    [false]: "value no",
};

function useLoadData({ id }) {
    const getPermission = useRouteGet("resource.permission", { id });
    const getSchema = useRouteGet("resource.schema");

    return useMemo(() => {
        if (getPermission.isLoading || getSchema.isLoading) {
            return [null, true];
        }

        const result = [];

        for (const [sid, scope] of Object.entries(getSchema.data.scopes)) {
            const pd = getPermission.data[sid];
            if (pd === undefined) continue;

            const sub = [];
            const itm = { key: sid, label: scope.label, items: sub };

            for (const [pid, permission] of Object.entries(scope.permissions)) {
                sub.push({
                    key: pid,
                    label: permission.label,
                    value: getPermission.data[sid][pid],
                });
            }

            result.push(itm);
        }

        return [result, false];
    }, [getPermission, getSchema]);
}

export function EffectivePermissions({ resourceId }) {
    const [data, isLoading] = useLoadData({ id: resourceId });

    if (isLoading) {
        return <LoadingWrapper />;
    }

    return (
        <div className="ngw-resource-effective-permisssions content-box">
            {/* TODO: Add user widget here */}
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
