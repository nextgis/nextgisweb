import { useState } from "react";

import { Checkbox, Input } from "@nextgisweb/gui/antd";
import type { FormField } from "@nextgisweb/gui/fields-form";
import { KeynameRule } from "@nextgisweb/gui/fields-form/rules/KeynameRule";
import { ModelForm } from "@nextgisweb/gui/model-form";
import type { Model } from "@nextgisweb/gui/model-form";
import { gettext, gettextf } from "@nextgisweb/pyramid/i18n";

import { PermissionSelect, PrincipalSelect } from "../component";
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
        return [
            {
                name: "display_name",
                label: gettext("Full name"),
                formItem: <Input />,
                required: true,
            },
            {
                name: "keyname",
                label: gettext("Group name"),
                required: true,
                rules: [KeynameRule],
                formItem: <Input />,
            },
            {
                name: "members",
                label: gettext("Users"),
                formItem: (
                    <PrincipalSelect
                        model={"user"}
                        multiple
                        systemUsers={["guest"]}
                        editOnClick
                    />
                ),
            },
            {
                name: "permissions",
                label: gettext("Permissions"),
                formItem: <PermissionSelect multiple />,
                value: [],
            },
            {
                name: "register",
                label: gettext("New users"),
                valuePropName: "checked",
                formItem: <Checkbox />,
            },
            {
                name: "oauth_mapping",
                label: gettextf("{dn} mapping")({ dn: oauth.name }),
                valuePropName: "checked",
                formItem: <Checkbox />,
                included: oauth.groupMapping,
            },
            {
                name: "description",
                label: gettext("Description"),
                formItem: <Input.TextArea />,
            },
        ];
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
