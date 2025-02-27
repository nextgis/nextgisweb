import { useMemo } from "react";

import settings from "@nextgisweb/auth/client-settings";
import type { GroupRead } from "@nextgisweb/auth/type/api";
import { Alert, Checkbox, Input } from "@nextgisweb/gui/antd";
import { LoadingWrapper } from "@nextgisweb/gui/component";
import { LanguageSelect } from "@nextgisweb/gui/component/language-select";
import type { FormField } from "@nextgisweb/gui/fields-form";
import { KeynameRule } from "@nextgisweb/gui/fields-form/rules/KeynameRule";
import { ModelForm } from "@nextgisweb/gui/model-form";
import type { Model } from "@nextgisweb/gui/model-form";
import { useRouteGet } from "@nextgisweb/pyramid/hook/useRouteGet";
import { gettext, gettextf } from "@nextgisweb/pyramid/i18n";

import { PermissionSelect, PrincipalSelect } from "../component";
import { makeTeamManageButton, default as oauth } from "../oauth";

import { UserWidgetAlinkToken } from "./UserWidgetAlinkToken";
import { UserWidgetPassword } from "./UserWidgetPassword";

const messages = {
    deleteConfirm: gettext("Delete user?"),
    deleteSuccess: gettext("User deleted"),
};

interface UserWidgetProps {
    id: number;
    readonly: boolean;
}

export function UserWidget({ id, readonly }: UserWidgetProps) {
    const { data: group, isLoading } = useRouteGet<GroupRead[]>(
        "auth.group.collection"
    );

    const isNewUser = useMemo(() => id === undefined, [id]);

    const fields = useMemo<FormField[]>(() => {
        return [
            {
                name: "display_name",
                label: gettext("Full name"),
                formItem: <Input />,
                required: true,
            },
            {
                name: "keyname",
                label: gettext("Login"),
                required: true,
                rules: [KeynameRule],
                formItem: <Input />,
            },
            {
                name: "password",
                label: gettext("Password"),
                formItem: isNewUser ? (
                    <Input.Password
                        autoComplete="new-password"
                        placeholder={gettext("Enter new password here")}
                    />
                ) : (
                    <UserWidgetPassword
                        autoComplete="new-password"
                        placeholder={gettext("Enter new password here")}
                    />
                ),
                required: true,
            },
            {
                name: "oauth_subject",
                label: oauth.name,
                formItem: <Input disabled />,
                included: oauth.enabled && !isNewUser,
            },
            {
                name: "alink_token",
                label: gettext("Authorization link"),
                formItem: <UserWidgetAlinkToken />,
                included: settings.alink,
            },
            {
                name: "disabled",
                label: gettext("Disabled"),
                valuePropName: "checked",
                formItem: <Checkbox />,
            },
            {
                name: "member_of",
                label: gettext("Groups"),
                formItem: (
                    <PrincipalSelect model="group" multiple editOnClick />
                ),
                value:
                    group && isNewUser
                        ? group.filter((g) => g.register).map((g) => g.id)
                        : [],
            },
            {
                name: "permissions",
                label: gettext("Permissions"),
                formItem: <PermissionSelect multiple />,
                value: [],
            },
            {
                name: "language",
                label: gettext("Language"),
                formItem: <LanguageSelect />,
                value: null,
            },
            {
                name: "description",
                label: gettext("Description"),
                formItem: <Input.TextArea />,
            },
        ];
    }, [group, isNewUser]);

    const infoNGID = useMemo(
        () =>
            oauth.isNGID &&
            isNewUser && (
                <Alert
                    type="info"
                    style={{ marginBottom: "1ex" }}
                    // prettier-ignore
                    message={gettextf("Consider adding {name} user to your team instead of creating a new user with a password.")({ name: oauth.name })}
                    action={makeTeamManageButton()}
                />
            ),
        [isNewUser]
    );
    if (isLoading) {
        return <LoadingWrapper></LoadingWrapper>;
    }

    const model: Model = {
        browse: "auth.user.browse",
        collection: "auth.user.collection",
        edit: "auth.user.edit",
        item: "auth.user.item",
    };

    return (
        <div className="ngw-auth-user-widget">
            {infoNGID}
            <ModelForm
                fields={fields}
                readonly={readonly}
                model={model}
                id={id}
                messages={messages}
            ></ModelForm>
        </div>
    );
}
