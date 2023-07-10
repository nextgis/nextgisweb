import { PropTypes } from "prop-types";
import { useState } from "react";

import { ContentBox } from "@nextgisweb/gui/component";
import { KeynameTextBox } from "@nextgisweb/gui/fields-form";
import { ModelForm } from "@nextgisweb/gui/model-form";
import i18n from "@nextgisweb/pyramid/i18n";

import { PrincipalSelect } from "../field";
import getMessages from "../groupMessages";
import { default as oauth } from "../oauth";

export function GroupWidget({ id }) {
    const [fields] = useState(() => {
        const fields_ = [
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
                label: i18n.gettext("Users"),
                widget: PrincipalSelect,
                inputProps: {
                    model: "user",
                    multiple: true,
                    systemUsers: ["guest"],
                    editOnClick: true,
                },
            },
            {
                name: "register",
                label: i18n.gettext("New users"),
                widget: "checkbox",
            },
        ];

        if (oauth.group_mapping) {
            fields_.push({
                name: "oauth_mapping",
                label: i18n.gettext("{dn} mapping").replace("{dn}", oauth.name),
                widget: "checkbox",
            });
        }

        fields_.push({
            name: "description",
            label: i18n.gettext("Description"),
            widget: "textarea",
        });
        return fields_;
    });

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
