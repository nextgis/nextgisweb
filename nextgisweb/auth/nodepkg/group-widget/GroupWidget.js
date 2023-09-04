import { useState } from "react";

import { KeynameTextBox } from "@nextgisweb/gui/fields-form";
import { ModelForm } from "@nextgisweb/gui/model-form";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { PrincipalSelect } from "../field";
import { default as oauth } from "../oauth";

const messages = {
    deleteConfirm: gettext("Delete group?"),
    deleteSuccess: gettext("Group deleted"),
};

export function GroupWidget({ id }) {
    const [fields] = useState(() => {
        const fields_ = [
            {
                name: "display_name",
                label: gettext("Full name"),
                required: true,
            },
            {
                name: "keyname",
                label: gettext("Group name"),
                required: true,
                widget: KeynameTextBox,
            },
            {
                name: "members",
                label: gettext("Users"),
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
                label: gettext("New users"),
                widget: "checkbox",
            },
        ];

        if (oauth.group_mapping) {
            fields_.push({
                name: "oauth_mapping",
                label: gettext("{dn} mapping").replace("{dn}", oauth.name),
                widget: "checkbox",
            });
        }

        fields_.push({
            name: "description",
            label: gettext("Description"),
            widget: "textarea",
        });
        return fields_;
    });

    return <ModelForm model="auth.group" {...{ fields, id, messages }} />;
}
