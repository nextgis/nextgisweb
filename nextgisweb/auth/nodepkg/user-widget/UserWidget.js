import { useMemo } from "react";

import { Alert } from "@nextgisweb/gui/antd";
import { LoadingWrapper } from "@nextgisweb/gui/component";
import {
    KeynameTextBox,
    LanguageSelect,
    Password,
} from "@nextgisweb/gui/fields-form";
import { ModelForm } from "@nextgisweb/gui/model-form";
import { useRouteGet } from "@nextgisweb/pyramid/hook/useRouteGet";
import { gettext } from "@nextgisweb/pyramid/i18n";
import settings from "@nextgisweb/pyramid/settings!auth";

import { PrincipalSelect } from "../field";
import { makeTeamManageButton, default as oauth } from "../oauth";

import { UserWidgetAlinkToken } from "./UserWidgetAlinkToken";
import { UserWidgetPassword } from "./UserWidgetPassword";

const messages = {
    deleteConfirm: gettext("Delete user?"),
    deleteSuccess: gettext("User deleted"),
};

export function UserWidget({ id }) {
    const { data: group, isLoading } = useRouteGet("auth.group.collection");

    const isNewUser = useMemo(() => id === undefined, [id]);

    const fields = useMemo(() => {
        const fields_ = [];

        fields_.push(
            ...[
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
                    autoComplete: "new-password",
                    placeholder: gettext("Enter new password here"),
                },
            ]
        );

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
            ...[
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
                    name: "language",
                    label: gettext("Language"),
                    widget: LanguageSelect,
                    value: null,
                },
                {
                    name: "description",
                    label: gettext("Description"),
                    widget: "textarea",
                },
            ]
        );

        return fields_;
    }, [group, isNewUser]);

    const props = { fields, model: "auth.user", id, messages };

    // prettier-ignore
    const infoNGID = useMemo(() => oauth.isNGID && isNewUser && <Alert
        type="info" style={{marginBottom: "1ex"}}
        message={gettext("Consider adding {name} user to your team instead of creating a new user with a password.").replace("{name}", oauth.name)}
        action={makeTeamManageButton()}
    />, []);

    if (isLoading) {
        return <LoadingWrapper></LoadingWrapper>;
    }

    return (
        <div className="ngw-auth-user-widget">
            {infoNGID}
            <ModelForm {...props}></ModelForm>
        </div>
    );
}
