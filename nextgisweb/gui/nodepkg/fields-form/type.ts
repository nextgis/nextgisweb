import type {
    FormItemProps as AntdFormItemProps,
    FormInstance,
} from "antd/lib/form";
import type { ComponentType, ReactNode } from "react";

import type { Form } from "@nextgisweb/gui/antd";

import type {
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

export type FormProps = Omit<Parameters<typeof Form>[0], "onChange" | "id">;

export type SizeType = FormProps["size"];

export interface FormFieldChoice {
    label?: string;
    value: string | number;
}

export interface WidgetFieldMap {
    checkbox: typeof Checkbox;
    date: typeof DateInput;
    datetime: typeof DateTimeInput;
    input: typeof Input;
    number: typeof Number;
    password: typeof Password;
    select: typeof Select;
    text: typeof TextArea;
    time: typeof TimeInput;
}

export interface FormOnChangeOptions {
    isValid: () => Promise<boolean>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    value: Record<string, any>;
}

export interface InputProps<V = unknown> {
    placeholder?: ReactNode;
    disabled?: boolean;
    value?: V;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    onChange?: (...args: any[]) => void;
}

export interface FormItemProps<
    P extends InputProps = InputProps,
    N extends string = string,
> extends AntdFormItemProps {
    name: N;
    placeholder?: string;
    inputProps?: P;
    disabled?: boolean;
    prepend?: ReactNode;
    append?: ReactNode;

    input?: ComponentType<P>;
}

export type WidgetName = keyof WidgetFieldMap;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FormWidgetComponent = (props: FormItemProps<any>) => JSX.Element;

export type FormWidget = WidgetName | FormWidgetComponent;

type GetWidgetInputPropsFromName<W extends WidgetName> = Exclude<
    Parameters<WidgetFieldMap[W]>[0]["inputProps"],
    undefined
>;
type GetWidgetInputPropsFromComponent<W extends FormWidgetComponent> = Exclude<
    Parameters<W>[0]["inputProps"],
    undefined
>;

type GetWidgetInputProps<W extends FormWidget> = W extends WidgetName
    ? GetWidgetInputPropsFromName<W>
    : W extends FormWidgetComponent
    ? GetWidgetInputPropsFromComponent<W>
    : GetWidgetInputPropsFromName<"input">;

export interface FormField<
    N extends string = string,
    W extends FormWidget = FormWidget,
> extends FormItemProps<GetWidgetInputProps<W>, N> {
    widget?: W;
    inputProps?: GetWidgetInputProps<W>;
    choices?: FormFieldChoice[];
    included?: boolean;
    requiredMessage?: string;
    // TODO: remove usage
    value?: unknown;
}

export interface FieldsFormProps extends FormProps {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    initialValues?: Record<string, any>;
    whenReady?: () => void;
    onChange?: (options: FormOnChangeOptions) => void;
    children?: ReactNode;
    fields: FormField[];
    form?: FormInstance;
}

// type InputField = FormField<"input">;
// type InputField2 = FormField<typeof Checkbox>;

// type B = InputField["inputProps"]["disabled"];
// type B2 = InputField2["inputProps"]["disabled"];

// const InputField: FormField = {
//     name: "field5",
//     label: "Field 5",
//     widget: "checkbox",
//     inputProps: {},
// };
