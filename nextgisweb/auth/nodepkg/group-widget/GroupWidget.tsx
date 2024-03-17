import { useState } from "react";

import { KeynameTextBox } from "@nextgisweb/gui/fields-form";
import type { FormField } from "@nextgisweb/gui/fields-form";
import { ModelForm } from "@nextgisweb/gui/model-form";
import type { Model } from "@nextgisweb/gui/model-form";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { PermissionSelect, PrincipalSelect } from "../field";
import { default as oauth } from "../oauth";

interface GroupWidgetProps {
    id: number;
    readonly: boolean;
}

const messages = {
    deleteConfirm: gettext("Delete group?"),
    deleteSuccess: gettext("Group deleted"),
};

export function GroupWidget({ id, readonly }: GroupWidgetProps) {
    const [fields] = useState<FormField[]>(() => {
        const fields_: FormField[] = [
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
                name: "permissions",
                label: gettext("Permissions"),
                widget: PermissionSelect,
                inputProps: { multiple: true },
                value: [],
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
            widget: "text",
        });
        return fields_;
    });

    const model: Model = {
        browse: "auth.group.browse",
        edit: "auth.group.edit",
        collection: "auth.group.collection",
        item: "auth.group.item",
    };
    return (
        <ModelForm
            model={model}
            readonly={readonly}
            fields={fields}
            id={id}
            messages={messages}
        />
    );
}
