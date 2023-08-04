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

export function FormItem(props: FormField) {
    const { required, requiredMessage, widget, ...formProps } = props;

    delete formProps.included;
    delete formProps.value;
    formProps.rules = formProps.rules || [];

    if (required) {
        formProps.rules.push({
            required: true,
            message: requiredMessage ?? i18n.gettext("This value is required"),
        });
    }

    let FormWidget: ElementType | undefined = undefined;
    if (typeof widget === "string") {
        FormWidget = widgetsByName[widget.toLowerCase() as WidgetName];
    } else if (widget) {
        FormWidget = widget;
    }
    FormWidget = FormWidget || Input;

    return <FormWidget {...formProps}></FormWidget>;
}
