import { gettext } from "@nextgisweb/pyramid/i18n";

import { FormItem as BaseFormItem } from "./field/_FormItem";
import type { FormField } from "./type";

function createRules(required?: boolean, requiredMessage?: string) {
    const rules = [];
    if (required) {
        rules.push({
            required: true,
            message: requiredMessage ?? gettext("This value is required"),
        });
    }
    return rules;
}

export function FormItem({
    required,
    requiredMessage,
    formItem,
    rules = [],
    included: _,
    value: __,
    ...restProps
}: FormField) {
    const newRules = [...rules, ...createRules(required, requiredMessage)];

    return <BaseFormItem input={formItem} {...restProps} rules={newRules} />;
}
