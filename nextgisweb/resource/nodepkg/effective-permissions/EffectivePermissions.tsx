import { Fragment, useState } from "react";

import { PrincipalSelect } from "@nextgisweb/auth/component";
import { LoadingWrapper } from "@nextgisweb/gui/component";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { useLoadData } from "./hook/useLoadData";

import "./EffectivePermissions.less";

interface EffectivePermissionsProps {
    resourceId: number;
}

const pvLabel = [gettext("No"), gettext("Yes")];
const pvClass = ["value no", "value yes"];

export function EffectivePermissions({
    resourceId,
}: EffectivePermissionsProps) {
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
