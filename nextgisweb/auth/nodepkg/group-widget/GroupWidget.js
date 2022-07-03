import { ContentBox } from "@nextgisweb/gui/component";
import { KeynameTextBox } from "@nextgisweb/gui/fields-form";
import { ModelForm } from "@nextgisweb/gui/model-form";
import { route } from "@nextgisweb/pyramid/api";
import i18n from "@nextgisweb/pyramid/i18n!auth";
import { PropTypes } from "prop-types";
import { useState } from "react";
import { PrincipalMemberSelect } from "../field";
import getMessages from "../groupMessages";

export function GroupWidget({ id }) {
    const [fields] = useState(() => [
        {
            name: "display_name",
            label: i18n.gettext("Full name"),
            required: true,
        },
        {
            name: "keyname",
            label: i18n.gettext("Group name"),
            required: true,
            widget: KeynameTextBox,
        },
        {
            name: "members",
            label: i18n.gettext("Group members"),
            widget: PrincipalMemberSelect,
            choices: async () =>
                (
                    await route("auth.user.collection").get({
                        query: { brief: true },
                    })
                ).filter((itm) => !itm.system || itm.keyname == "guest"),
        },
        {
            name: "register",
            label: i18n.gettext("New users"),
            widget: "checkbox",
        },
        {
            name: "description",
            label: i18n.gettext("Description"),
            widget: "textarea",
        },
    ]);

    const p = { fields, model: "auth.group", id, messages: getMessages() };

    return (
        <ContentBox>
            <ModelForm {...p}></ModelForm>
        </ContentBox>
    );
}

GroupWidget.propTypes = {
    id: PropTypes.number,
};
