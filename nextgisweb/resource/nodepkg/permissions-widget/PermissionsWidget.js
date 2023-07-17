import { observer } from "mobx-react-lite";
import { useMemo } from "react";

import { PrincipalSelect } from "@nextgisweb/auth/component";
import { Select, Space } from "@nextgisweb/gui/antd";
import { EdiTable } from "@nextgisweb/gui/edi-table";
import blueprint from "@nextgisweb/pyramid/api/load!/api/component/resource/blueprint";

import { ResourceIcon, AllowIcon, DenyIcon } from "../icon";
import AddIcon from "@material-icons/svg/add_circle_outline";

import i18n from "@nextgisweb/pyramid/i18n";

const { Option, OptGroup } = Select;

const colAction = i18n.gettext("Action");
const colPrincipal = i18n.gettext("Principal");
const colApply = i18n.gettext("Apply to");
const colPermission = i18n.gettext("Permission");

const actionAdd = i18n.gettext("Add");
const actionAllow = i18n.gettext("Allow");
const actionDeny = i18n.gettext("Deny");

const applyPropagate = i18n.gettext("This and subresources");
const applyThis = i18n.gettext("This resource only");

const allPermissions = i18n.gettext("All permissions");

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
                    <IconText icon={<AllowIcon />} text={actionAllow} />
                </Option>
                <Option value="deny">
                    <IconText icon={<DenyIcon />} text={actionDeny} />
                </Option>
            </>
        );
    }, []);

    return (
        <Select
            {...bindProp(row, "action")}
            {...selectDefaults}
            placeholder={<IconText icon={<AddIcon />} text={actionAdd} />}
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
            placeholder={colPrincipal}
        />
    );
});

const Apply = observer(({ row }) => {
    const options = useMemo(() => {
        const result = [
            <Option key="false" value={false}>
                {applyThis}
            </Option>,
            <Option key="true" value={true}>
                {applyPropagate}
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
            placeholder={colApply}
        >
            {options}
        </Select>
    );
});

const Permission = observer(({ row }) => {
    const options = useMemo(() => {
        const result = [
            <Option key="" value="" label={allPermissions}>
                {allPermissions}
            </Option>,
        ];

        const scopes = [...row.scopes];

        for (const [sid, scope] of Object.entries(blueprint.scopes)) {
            if (!scopes.includes(sid)) continue;
            const scopeOptions = [];

            const label = scope.label + ": " + allPermissions;
            scopeOptions.push(
                <Option key={sid} value={sid} label={label}>
                    {allPermissions}
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
            placeholder={colPermission}
        >
            {options}
        </Select>
    );
});

// prettier-ignore
const columns = [
    { key: "action", title: colAction, shrink: true, component: Action },
    { key: "principal", title: colPrincipal, width: "50%", component: Principal },
    { key: "apply", title: colApply, shrink: applyPropagate.length + "ch", component: Apply },
    { key: "permission", title: colPermission, width: "50%", component: Permission },
];

export const PermissionsWidget = observer(({ store }) => {
    return <EdiTable {...{ store, columns }} parentHeight />;
});

PermissionsWidget.title = i18n.gettext("Permissions");
PermissionsWidget.order = 50;
