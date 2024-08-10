import { useEffect, useMemo, useRef } from "react";

import { Form } from "@nextgisweb/gui/antd";

import { FieldsFormVirtualized } from "./FieldsFormVirtualized";
import { FormItem } from "./FormItem";
import type { FieldsFormProps, FormProps } from "./type";

export function FieldsForm<
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    P extends Record<string, any> = Record<string, any>,
>({
    form,
    fields = [],
    children,
    onChange,
    whenReady,
    virtualize = false,
    initialValues,
    ...formProps
}: FieldsFormProps<P>) {
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
            onChange({ isValid, value: value as P });
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

    const includedFields = useMemo(
        () => fields.filter((f) => f.included ?? true),
        [fields]
    );

    return (
        <Form
            labelWrap
            colon={false}
            {...modifiedFormProps}
            className="fields-form"
            style={{ width: "100%", height: virtualize ? "100%" : undefined }}
        >
            {virtualize ? (
                <FieldsFormVirtualized fields={includedFields}>
                    {children}
                </FieldsFormVirtualized>
            ) : (
                includedFields.map((f) => <FormItem key={f.name} {...f} />)
            )}
            {children}
        </Form>
    );
}
