import { observer } from "mobx-react-lite";
import { useMemo } from "react";

import { PrincipalSelect } from "@nextgisweb/auth/component";
import { Button, Select, Space, Table, Tooltip } from "@nextgisweb/gui/antd";
import { SvgIcon } from "@nextgisweb/gui/svg-icon";
import blueprint from "@nextgisweb/pyramid/api/load!/api/component/resource/blueprint";

import AddIcon from "@material-icons/svg/add_circle_outline";
import AllowIcon from "@material-icons/svg/check_circle";
import DeleteIcon from "@material-icons/svg/clear";
import CloneIcon from "@material-icons/svg/copy_all";
import ErrorIcon from "@material-icons/svg/error";
import DenyIcon from "@material-icons/svg/remove_circle";

import i18n from "@nextgisweb/pyramid/i18n";
import "./PermissionsWidget.less";

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

const selectDefaults = {
    allowClear: false,
    style: { width: "100%" },
    bordered: false,
};

const bindProp = (item, prop) => ({
    value: item[prop],
    onChange: (value) => {
        item.update({ [prop]: value });
    },
});

const Action = observer(({ item }) => {
    const options = useMemo(() => {
        return (
            <>
                <Option value="allow">
                    <Space>
                        <AllowIcon style={{ color: "var(--success)" }} />
                        {actionAllow}
                    </Space>
                </Option>
                <Option value="deny" className="deny">
                    <Space>
                        <DenyIcon style={{ color: "var(--danger)" }} />
                        {actionDeny}
                    </Space>
                </Option>
            </>
        );
    }, []);

    return (
        <Select
            {...bindProp(item, "action")}
            {...selectDefaults}
            placeholder={<Space><AddIcon/>{actionAdd}</Space>}
        >
            {options}
        </Select>
    );
});

const Principal = observer(({ item }) => {
    if (item.isPlaceholder) return <></>;
    return (
        <PrincipalSelect
            systemUsers
            {...bindProp(item, "principal")}
            {...selectDefaults}
            placeholder={colPrincipal}
        />
    );
});

const Apply = observer(({ item }) => {
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
                    <Space>
                        <SvgIcon icon={"rescls-" + identity} />
                        {label}
                    </Space>
                </Option>
            );
        }

        return result;
    }, []);

    if (item.isPlaceholder) return <></>;

    const value = item.identity ? item.identity : item.propagate;
    const onChange = (v) => {
        if (typeof v === "boolean") {
            item.update({ identity: "", propagate: v });
        } else {
            item.update({ identity: v, propagate: true });
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

const Permission = observer(({ item }) => {
    const options = useMemo(() => {
        const result = [
            <Option key="" value="" label={allPermissions}>
                {allPermissions}
            </Option>,
        ];

        const scopes = [...item.scopes];

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
    }, [item.propagate, item.identity]);

    if (item.isPlaceholder) return <></>;

    const { scope: scp, permission: perm } = item;
    const value = scp !== null ? scp + (perm ? ":" + perm : "") : null;
    const onChange = (v) => {
        const [scope, permission] = v.split(":", 2);
        item.update({ scope: scope || "", permission: permission || "" });
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

const MenuButton = ({ onClick, icon, tooltip, error }) => (
    <Tooltip title={tooltip}>
        <Button
            onClick={onClick}
            style={error ? { color: "var(--error" } : {}}
            icon={icon}
            type="text"
            shape="circle"
        />
    </Tooltip>
);

const Menu = observer(({ item }) => {
    if (item.isPlaceholder) return <></>;
    return (
        <>
            {item.store.validate && item.error !== null && (
                <MenuButton icon={<ErrorIcon />} tooltip={item.error} error />
            )}
            <MenuButton onClick={item.clone.bind(item)} icon={<CloneIcon />} />
            <MenuButton
                onClick={item.delete.bind(item)}
                icon={<DeleteIcon />}
            />
        </>
    );
});

const maxWidth = (a, p) => Math.max(...a.map((i) => i.length + p)) + "ch";

const mwVars = {
    "--mw-action": maxWidth([actionAllow, actionDeny, actionAdd], 6),
    "--mw-apply": maxWidth([applyThis, applyPropagate], 2),
};

const column = (key, title, Render) => ({
    key: key,
    className: key,
    title: title,
    render: (_, item) => <Render {...{ item }} />,
});

const columns = [
    column("action", colAction, Action),
    column("principal", colPrincipal, Principal),
    column("apply", colApply, Apply),
    column("permission", colPermission, Permission),
    column("menu", null, Menu),
];

export const PermissionsWidget = observer(({ store }) => {
    return (
        <div className="ngw-resource-permissions-widget" style={{ ...mwVars }}>
            <Table
                columns={columns}
                dataSource={[...store.items]}
                parentHeight
                size="small"
            />
        </div>
    );
});

PermissionsWidget.title = i18n.gettext("Permissions");
PermissionsWidget.order = 50;
