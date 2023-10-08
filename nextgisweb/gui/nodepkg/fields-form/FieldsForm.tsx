import { useEffect, useRef } from "react";

import { Form } from "@nextgisweb/gui/antd";

import { FormItem } from "./FormItem";
import type { FieldsFormProps, FormProps } from "./type";

export function FieldsForm({
    form,
    fields = [],
    children,
    onChange,
    whenReady,
    initialValues,
    ...formProps
}: FieldsFormProps) {
    const localForm = Form.useForm(form)[0];
    const readyRef = useRef(whenReady);

    useEffect(() => {
        readyRef.current?.();
    }, []);

    const isValid = async () =>
        localForm.getFieldsError().every((e) => !e.errors.length);

    const onFieldsChange: FormProps["onFieldsChange"] = (changedFields) => {
        const value: Record<string, unknown> = {};
        for (const c of changedFields) {
            const namePaths: (number | string)[] = Array.isArray(c.name)
                ? c.name
                : [c.name];
            for (const name of namePaths) {
                value[name] = c.value;
            }
        }
        if (onChange) {
            onChange({ isValid, value });
        }
    };

    const modifiedFormProps: Partial<FormProps> = {
        form: localForm,
        initialValues,
        autoComplete: "off",
        labelCol: { span: 5 },
        labelAlign: "left",
        ...formProps,
        ...(onChange && { onFieldsChange }),
    };

    const includedFormItems = fields.filter((f) => f.included ?? true);

    return (
        <Form
            labelWrap
            colon={false}
            {...modifiedFormProps}
            className="fields-form"
        >
            {includedFormItems.map((f) => (
                <FormItem key={f.name} {...f} />
            ))}
            {children}
        </Form>
    );
}
