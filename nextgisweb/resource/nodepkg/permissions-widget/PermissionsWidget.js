import { observer } from "mobx-react-lite";
import { useMemo } from "react";

import { PrincipalSelect } from "@nextgisweb/auth/component";
import { Select, Space } from "@nextgisweb/gui/antd";
import { EdiTable } from "@nextgisweb/gui/edi-table";
import blueprint from "@nextgisweb/pyramid/api/load!/api/component/resource/blueprint";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { AllowIcon, DenyIcon, ResourceIcon } from "../icon";

import AddIcon from "@nextgisweb/icon/material/add_circle_outline";

const { Option, OptGroup } = Select;

const msgColAction = gettext("Action");
const msgColPrincipal = gettext("Principal");
const msgColApply = gettext("Apply to");
const msgColPermission = gettext("Permission");

const msgActionAdd = gettext("Add");
const msgActionAllow = gettext("Allow");
const msgActionDeny = gettext("Deny");

const msgApplyPropagate = gettext("This and subresources");
const msgApplyThis = gettext("This resource only");

const msgAllPermissions = gettext("All permissions");

const selectDefaults = { allowClear: false, bordered: false };

const IconText = ({ icon, text }) => (
    <Space>
        {icon}
        {text}
    </Space>
);

const bindProp = (item, prop) => ({
    value: item[prop],
    onChange: (value) => {
        item.update({ [prop]: value });
    },
});

const Action = observer(({ row }) => {
    const options = useMemo(() => {
        return (
            <>
                <Option value="allow">
                    <IconText icon={<AllowIcon />} text={msgActionAllow} />
                </Option>
                <Option value="deny">
                    <IconText icon={<DenyIcon />} text={msgActionDeny} />
                </Option>
            </>
        );
    }, []);

    return (
        <Select
            {...bindProp(row, "action")}
            {...selectDefaults}
            placeholder={<IconText icon={<AddIcon />} text={msgActionAdd} />}
            popupMatchSelectWidth={false}
        >
            {options}
        </Select>
    );
});

const Principal = observer(({ row }) => {
    return (
        <PrincipalSelect
            systemUsers
            {...bindProp(row, "principal")}
            {...selectDefaults}
            placeholder={msgColPrincipal}
        />
    );
});

const Apply = observer(({ row }) => {
    const options = useMemo(() => {
        const result = [
            <Option key="false" value={false}>
                {msgApplyThis}
            </Option>,
            <Option key="true" value={true}>
                {msgApplyPropagate}
            </Option>,
        ];

        for (const { identity, label } of Object.values(blueprint.resources)) {
            if (identity === "resource") continue;
            result.push(
                <Option key={identity} value={identity}>
                    <IconText
                        icon={<ResourceIcon {...{ identity }} />}
                        text={label}
                    />
                </Option>
            );
        }

        return result;
    }, []);

    const value = row.identity ? row.identity : row.propagate;
    const onChange = (v) => {
        if (typeof v === "boolean") {
            row.update({ identity: "", propagate: v });
        } else {
            row.update({ identity: v, propagate: true });
        }
    };

    return (
        <Select
            {...{ value, onChange }}
            {...selectDefaults}
            placeholder={msgColApply}
        >
            {options}
        </Select>
    );
});

const Permission = observer(({ row }) => {
    const options = useMemo(() => {
        const result = [
            <Option key="" value="" label={msgAllPermissions}>
                {msgAllPermissions}
            </Option>,
        ];

        const scopes = [...row.scopes];

        for (const [sid, scope] of Object.entries(blueprint.scopes)) {
            if (!scopes.includes(sid)) continue;
            const scopeOptions = [];

            const label = scope.label + ": " + msgAllPermissions;
            scopeOptions.push(
                <Option key={sid} value={sid} label={label}>
                    {msgAllPermissions}
                </Option>
            );

            for (const [pid, permission] of Object.entries(scope.permissions)) {
                const value = sid + ":" + pid;
                const label = scope.label + ": " + permission.label;
                scopeOptions.push(
                    <Option key={value} {...{ value, label }}>
                        {permission.label}
                    </Option>
                );
            }

            result.push(
                <OptGroup key={sid} label={scope.label}>
                    {scopeOptions}
                </OptGroup>
            );
        }
        return result;
    }, [row.propagate, row.identity]);

    const { scope: scp, permission: perm } = row;
    const value = scp !== null ? scp + (perm ? ":" + perm : "") : null;
    const onChange = (v) => {
        const [scope, permission] = v.split(":", 2);
        row.update({ scope: scope || "", permission: permission || "" });
    };

    return (
        <Select
            {...{ value, onChange }}
            optionLabelProp="label"
            {...selectDefaults}
            placeholder={msgColPermission}
        >
            {options}
        </Select>
    );
});

// prettier-ignore
const columns = [
    { key: "action", title: msgColAction, shrink: true, component: Action },
    { key: "principal", title: msgColPrincipal, width: "50%", component: Principal },
    { key: "apply", title: msgColApply, shrink: msgApplyPropagate.length + "ch", component: Apply },
    { key: "permission", title: msgColPermission, width: "50%", component: Permission },
];

export const PermissionsWidget = observer(({ store }) => {
    return <EdiTable {...{ store, columns }} parentHeight />;
});

PermissionsWidget.title = gettext("Permissions");
PermissionsWidget.order = 50;
