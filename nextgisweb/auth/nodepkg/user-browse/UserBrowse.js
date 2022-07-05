import AdministratorIcon from "@material-icons/svg/local_police";
import RegularUserIcon from "@material-icons/svg/person";
import { Badge, Button, Tooltip, Alert } from "@nextgisweb/gui/antd";
import { utc } from "@nextgisweb/gui/dayjs";
import { ModelBrowse } from "@nextgisweb/gui/model-browse";
import { route } from "@nextgisweb/pyramid/api";
import i18n from "@nextgisweb/pyramid/i18n!auth";
import { useState, useMemo } from "react";
import getMessages from "../userMessages";
import { default as oauth, makeTeamManageButton } from "../oauth";

const messages = {
    disabled: i18n.gettext("Disabled"),
    enabled: i18n.gettext("Enabled"),
};

const columns = [];

columns.push({
    title: i18n.gettext("Full name"),
    dataIndex: "display_name",
    key: "display_name",
    render: (text, record) => (
        <>
            {record.is_administrator ? (
                <AdministratorIcon />
            ) : (
                <RegularUserIcon />
            )}{" "}
            {text}
        </>
    ),
    sorter: (a, b) => (a.display_name > b.display_name ? 1 : -1),
});

columns.push({
    title: i18n.gettext("Login"),
    dataIndex: "keyname",
    key: "keyname",
    sorter: (a, b) => (a.keyname > b.keyname ? 1 : -1),
});

if (oauth.enabled) {
    columns.push({
        title: // prettier-ignore
            <Tooltip title={i18n.gettext("Users with a password can sign in with login and password.")}>
                {i18n.gettext("Password")}
            </Tooltip>,
        dataIndex: "has_password",
        key: "has_password",
        render: (value) => (value ? i18n.gettext("Yes") : i18n.gettext("No")),
        sorter: (a, b) => (a.has_password > b.has_password ? 1 : -1),
    });

    columns.push({
        title: // prettier-ignore
            <Tooltip title={i18n.gettext("Users bound to {dn} can sign in with {dn}.").replaceAll('{dn}', oauth.name)}>
                {oauth.name}
            </Tooltip>,
        dataIndex: "has_oauth",
        key: "has_oauth",
        render: (value) => (value ? i18n.gettext("Yes") : i18n.gettext("No")),
        sorter: (a, b) => (a.has_oauth > b.has_oauth ? 1 : -1),
    });
}

columns.push({
    title: i18n.gettext("Last activity"),
    dataIndex: "last_activity",
    key: "last_activity",
    sorter: (a, b) => {
        const [al, bl] = [a.last_activity, b.last_activity].map((l) =>
            l ? new Date(l).getTime() : 0
        );
        return al - bl;
    },
    render: (text) => (text ? utc(text).local().format("L LTS") : ""),
});

columns.push({
    title: i18n.gettext("Status"),
    dataIndex: "disabled",
    key: "disabled",
    render: (text) => {
        return text ? messages.disabled : messages.enabled;
    },
    sorter: (a, b) => (a.disabled > b.disabled ? 1 : -1),
});

export function UserBrowse() {
    const DisableSelectedUsers = (props) => {
        return ToggleSelectedUsers({ disable: true, ...props });
    };
    const EnableSelectedUsers = (props) => {
        return ToggleSelectedUsers({ disable: false, ...props });
    };

    const [toggleLoading, setToggleLoading] = useState(false);

    const ToggleSelectedUsers = ({ disable, selected, rows, setRows }) => {
        const usersToToggle = [];
        for (const r of rows) {
            if (
                selected.includes(r.id) &&
                (disable ? !r.disabled : r.disabled)
            ) {
                usersToToggle.push(r.id);
            }
        }
        if (!usersToToggle.length) {
            return null;
        }

        const toggleUser = async () => {
            setToggleLoading(true);
            const toggledUsers = [];
            for (const u of usersToToggle) {
                try {
                    const json = {
                        disabled: disable,
                    };
                    await route("auth.user.item", u).put({
                        json,
                    });
                    toggledUsers.push(u);
                } catch {
                    // ignore
                }
            }
            const newRows = [];
            for (const r of rows) {
                if (toggledUsers.includes(r.id)) {
                    const newRow = { ...r };
                    newRow.disabled = disable;
                    newRows.push(newRow);
                } else {
                    newRows.push(r);
                }
            }
            setToggleLoading(false);
            setRows(newRows);
        };

        return (
            <Badge
                count={toggleLoading ? 0 : usersToToggle.length}
                size="small"
                key={
                    disable ? "DisableSelectedControl" : "EnableSelectedControl"
                }
            >
                <Button onClick={toggleUser} loading={toggleLoading}>
                    {disable ? i18n.gettext("Disable") : i18n.gettext("Enable")}
                </Button>
            </Badge>
        );
    };

    // prettier-ignore
    const infoNGID = useMemo(() => oauth.isNGID && <Alert
        type="info" style={{marginTop: "1ex"}}
        message={i18n.gettext("Your team members won't be shown here until their first logon. Set \"New users\" flag for a group to automatically assign new user to this group. You may also modify permission for authenticated users to manage access for your team members.").replace("{name}", oauth.name)}
    />, []);

    const tmBtn = makeTeamManageButton({ target: "_blank" });

    return (
        <div className="ngw-auth-user-browse">
            <ModelBrowse
                model="auth.user"
                columns={columns}
                messages={getMessages()}
                collectionOptions={{ query: { brief: true } }}
                collectionFilter={(itm) => !itm.system}
                headerControls={(tmBtn && [() => tmBtn]) || []}
                selectedControls={[EnableSelectedUsers, DisableSelectedUsers]}
            />
            {infoNGID}
        </div>
    );
}
