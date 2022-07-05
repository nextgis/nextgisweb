import { ContentBox } from "@nextgisweb/gui/component";
import { Alert } from "@nextgisweb/gui/antd";
import { KeynameTextBox, LanguageSelect } from "@nextgisweb/gui/fields-form";
import { ModelForm } from "@nextgisweb/gui/model-form";
import { route } from "@nextgisweb/pyramid/api";
import i18n from "@nextgisweb/pyramid/i18n!auth";
import { PropTypes } from "prop-types";
import { useMemo } from "react";
import { PrincipalMemberSelect } from "../field";
import getMessages from "../userMessages";
import { default as oauth, makeTeamManageButton } from "../oauth";

export function UserWidget({ id }) {
    const fields = useMemo(() => {
        const result = [];

        result.push({
            name: "display_name",
            label: i18n.gettext("Full name"),
            required: true,
        });

        result.push({
            name: "keyname",
            label: i18n.gettext("Login"),
            required: true,
            widget: KeynameTextBox,
        });

        result.push({
            name: "password",
            label: i18n.gettext("Password"),
            widget: "password",
            // required only when creating a new user
            required: id === undefined,
            placeholder:
                id !== undefined ? i18n.gettext("Enter new password here") : "",
        });

        if (oauth.enabled && id) {
            result.push({
                name: "oauth_subject",
                label: oauth.name,
                disabled: true,
            });
        }

        result.push({
            name: "disabled",
            label: i18n.gettext("Disabled"),
            widget: "checkbox",
        });

        result.push({
            name: "member_of",
            label: i18n.gettext("Groups member"),
            widget: PrincipalMemberSelect,
            choices: () =>
                route("auth.group.collection").get({ query: { brief: true } }),
        });

        result.push({
            name: "language",
            label: i18n.gettext("Language"),
            widget: LanguageSelect,
            value: null,
        });

        result.push({
            name: "description",
            label: i18n.gettext("Description"),
            widget: "textarea",
        });

        return result;
    }, []);

    const p = { fields, model: "auth.user", id, messages: getMessages() };

    // prettier-ignore
    const infoNGID = useMemo(() => oauth.isNGID && !id && <Alert
        type="info" style={{marginBottom: "1ex"}}
        message={i18n.gettext("Consider adding {name} user to your team instead of creating a new user with a password.").replace("{name}", oauth.name)}
        action={makeTeamManageButton()}
    />, []);

    return (
        <div className="ngw-auth-user-widget">
            {infoNGID}
            <ContentBox>
                <ModelForm {...p}></ModelForm>
            </ContentBox>
        </div>
    );
}

UserWidget.propTypes = {
    id: PropTypes.number,
};
