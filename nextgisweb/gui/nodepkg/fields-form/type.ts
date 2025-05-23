import type { ComponentType, ReactNode } from "react";

import type {
    FormItemProps as AntdFormItemProps,
    Form,
    FormInstance,
} from "@nextgisweb/gui/antd";

export type FormProps = Omit<
    Parameters<typeof Form>[0],
    "onChange" | "id" | "form"
> & { form?: FormInstance<any> };

export type SizeType = FormProps["size"];

export interface FormFieldChoice {
    label?: string;
    value: string | number;
}

export interface FormOnChangeOptions<
    P extends Record<string, any> = Record<string, unknown>,
> {
    isValid: () => Promise<boolean>;
    value: P;
}

export interface ChildProps {
    id?: string;
    [key: string]: unknown;
}

export type NameType<N extends string = string> = N | `#${string}`;

export interface FormItemProps<N extends string = string>
    extends AntdFormItemProps {
    name: NameType<N>;
    prepend?: ReactNode;
    append?: ReactNode;
    input?: ComponentType<ChildProps> | React.ReactNode;
}

export interface FormField<N extends string = string> extends FormItemProps<N> {
    included?: boolean;
    requiredMessage?: string;
    formItem: ComponentType<ChildProps> | React.ReactNode;
    // TODO: remove usage
    /** @deprecated use {@link FieldsFormProps.initialValues} instead */
    value?: unknown;
}

export interface FieldsFormProps<
    P extends Record<string, any> = Record<string, any>,
> extends FormProps {
    initialValues?: Partial<P>;
    virtualize?: boolean;
    whenReady?: () => void;
    onChange?: (options: FormOnChangeOptions<P>) => void;
    children?: ReactNode;
    fields: FormField<Extract<keyof P, string>>[];
    form?: FormInstance<P>;
}
