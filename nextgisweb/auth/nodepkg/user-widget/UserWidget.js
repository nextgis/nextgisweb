import { ContentBox } from "@nextgisweb/gui/component";
import { ModelForm } from "@nextgisweb/gui/model-form";
import { KeynameTextBox, LanguageSelect } from "@nextgisweb/gui/fields-form";
import { route } from "@nextgisweb/pyramid/api";
import i18n from "@nextgisweb/pyramid/i18n!auth";
import { PropTypes } from "prop-types";
import { useState } from "react";
import { PrincipalMemberSelect } from "../field";

export function UserWidget({ id }) {
    const [fields] = useState(() => [
        {
            name: "display_name",
            label: i18n.gettext("Full name"),
            required: true,
        },
        {
            name: "keyname",
            label: i18n.gettext("Login"),
            required: true,
            widget: KeynameTextBox,
        },
        {
            name: "password",
            label: i18n.gettext("Password"),
            widget: "password",
            // required only when creating a new user
            required: id === undefined,
            placeholder:
                id !== undefined ? i18n.gettext("Enter new password here") : "",
        },
        {
            name: "disabled",
            label: i18n.gettext("Disabled"),
            widget: "checkbox",
        },
        {
            name: "member_of",
            label: i18n.gettext("Groups member"),
            widget: PrincipalMemberSelect,
            choices: () =>
                route("auth.group.collection").get({ query: { brief: true } }),
        },
        {
            name: "language",
            label: i18n.gettext("Language"),
            widget: LanguageSelect,
            value: null,
        },
        {
            name: "oauth_subject",
            label: i18n.gettext("OAuth subject"),
            disabled: true,
        },
        {
            name: "description",
            label: i18n.gettext("Description"),
            widget: "textarea",
        },
    ]);

    const p = { fields, model: "auth.user", id };

    return (
        <ContentBox>
            <ModelForm {...p}></ModelForm>
        </ContentBox>
    );
}

UserWidget.propTypes = {
    id: PropTypes.number,
};
