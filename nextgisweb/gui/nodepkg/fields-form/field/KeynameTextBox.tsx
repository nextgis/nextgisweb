import { Input } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { FormItemProps } from "../type";

type InputProps = Parameters<typeof Input>[0];

import { FormItem } from "./_FormItem";

export function KeynameTextBox({ ...props }: FormItemProps<InputProps>) {
    const rules = props.rules ? props.rules : [];
    rules.push({
        pattern: new RegExp(/^[A-Za-z][\w-]*$/g),
        message: gettext("The value entered is not valid"),
    });
    const p = { ...props, rules };
    return <FormItem {...p} input={Input} />;
}
