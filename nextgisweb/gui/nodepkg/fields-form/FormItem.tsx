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

import i18n from "@nextgisweb/pyramid/i18n";

import type { ElementType } from "react";
import type { FormField, WidgetName, FormWidgetComponent } from "./type";

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
    formProps.rules = formProps.rules || [];

    if (required) {
        formProps.rules.push({
            required: true,
            message: requiredMessage ?? i18n.gettext("This value is required"),
        });
    }

    let FormWidget: ElementType = Input;

    if (typeof widget === "string") {
        FormWidget = widgetsByName[widget.toLowerCase() as WidgetName] || Input;
    } else if (widget) {
        FormWidget = widget;
    }

    return <FormWidget {...formProps} />;
}
