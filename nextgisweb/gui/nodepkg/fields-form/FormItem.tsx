import { useMemo } from "react";

import { gettext } from "@nextgisweb/pyramid/i18n";

import {
    Checkbox,
    DateInput,
    DateTimeInput,
    Input,
    Number,
    Password,
    Select,
    TextArea,
    TimeInput,
} from "./fields";
import type { FormField, FormWidgetComponent, WidgetName } from "./type";

export const widgetsByName: Record<WidgetName, FormWidgetComponent> = {
    checkbox: Checkbox,
    date: DateInput,
    datetime: DateTimeInput,
    input: Input,
    number: Number,
    password: Password,
    select: Select,
    text: TextArea,
    time: TimeInput,
};

export function FormItem({
    required,
    requiredMessage,
    widget,
    ...formProps
}: FormField) {
    delete formProps.included;
    delete formProps.value;
    formProps.rules = formProps.rules ? [...formProps.rules] : [];

    if (required) {
        formProps.rules.push({
            required: true,
            message: requiredMessage ?? gettext("This value is required"),
        });
    }

    const FormWidget = useMemo(() => {
        if (typeof widget === "string") {
            return widgetsByName[widget.toLowerCase() as WidgetName] || Input;
        } else if (widget) {
            return widget;
        }
        return Input;
    }, [widget]);

    return <FormWidget {...formProps} />;
}
