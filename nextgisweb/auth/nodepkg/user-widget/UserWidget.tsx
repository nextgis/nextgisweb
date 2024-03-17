import { useMemo } from "react";

import type { GroupRead } from "@nextgisweb/auth/type/api";
import { Alert } from "@nextgisweb/gui/antd";
import { LoadingWrapper } from "@nextgisweb/gui/component";
import {
    KeynameTextBox,
    LanguageSelect,
    Password,
} from "@nextgisweb/gui/fields-form";
import type { FormField } from "@nextgisweb/gui/fields-form";
import { ModelForm } from "@nextgisweb/gui/model-form";
import type { Model } from "@nextgisweb/gui/model-form";
import { useRouteGet } from "@nextgisweb/pyramid/hook/useRouteGet";
import { gettext } from "@nextgisweb/pyramid/i18n";
import settings from "@nextgisweb/pyramid/settings!auth";

import { PermissionSelect, PrincipalSelect } from "../field";
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
        const fields_: FormField[] = [
            {
                name: "display_name",
                label: gettext("Full name"),
                required: true,
            },
            {
                name: "keyname",
                label: gettext("Login"),
                required: true,
                widget: KeynameTextBox,
            },
            {
                name: "password",
                label: gettext("Password"),
                widget: isNewUser ? Password : UserWidgetPassword,
                required: true,
                inputProps: {
                    autoComplete: "new-password",
                    placeholder: gettext("Enter new password here"),
                },
            },
        ];

        if (oauth.enabled && !isNewUser) {
            fields_.push({
                name: "oauth_subject",
                label: oauth.name,
                disabled: true,
            });
        }

        if (settings.alink) {
            fields_.push({
                name: "alink_token",
                label: gettext("Authorization link"),
                widget: UserWidgetAlinkToken,
            });
        }

        fields_.push(
            {
                name: "disabled",
                label: gettext("Disabled"),
                widget: "checkbox",
            },
            {
                name: "member_of",
                label: gettext("Groups"),
                widget: PrincipalSelect,
                inputProps: {
                    model: "group",
                    multiple: true,
                    editOnClick: true,
                },
                value:
                    group && isNewUser
                        ? group.filter((g) => g.register).map((g) => g.id)
                        : [],
            },
            {
                name: "permissions",
                label: gettext("Permissions"),
                widget: PermissionSelect,
                inputProps: { multiple: true },
                value: [],
            },
            {
                name: "language",
                label: gettext("Language"),
                widget: LanguageSelect,
                value: null,
            },
            {
                name: "description",
                label: gettext("Description"),
                widget: "text",
            }
        );

        return fields_;
    }, [group, isNewUser]);

    // prettier-ignore
    const infoNGID = useMemo(() => oauth.isNGID && isNewUser && <Alert
        type="info" style={{marginBottom: "1ex"}}
        message={gettext("Consider adding {name} user to your team instead of creating a new user with a password.").replace("{name}", oauth.name)}
        action={makeTeamManageButton()}
    />, []);
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
