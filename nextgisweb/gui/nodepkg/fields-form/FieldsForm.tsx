import { Fragment, useEffect, useMemo, useRef } from "react";

import { Form } from "@nextgisweb/gui/antd";

import { FormItem } from "./FormItem";

import { FieldsFormProps, FormProps } from "./type";

export function FieldsForm({
    form,
    fields,
    children,
    onChange,
    whenReady,
    initialValues,
    ...formProps
}: FieldsFormProps) {
    const form_ = Form.useForm(form)[0];
    const whenReady_ = useRef(whenReady);

    const isValid = async () => {
        return form_.getFieldsError().every((e) => {
            return e.errors.length === 0;
        });
    };
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

    const formProps_: Partial<FormProps> = {
        form: form_,
        initialValues,
        autoComplete: "off",
        labelCol: { span: 5 },
        labelAlign: "left",
        ...formProps,
    };

    if (onChange) {
        formProps_.onFieldsChange = onFieldsChange;
    }

    const includedFormItems = useMemo(
        () =>
            fields
                ? fields.filter((f) => {
                      const included = f.included;
                      if (included !== undefined) {
                          return !!included;
                      }
                      return true;
                  })
                : [],
        [fields]
    );

    useEffect(() => {
        if (whenReady_.current) {
            whenReady_.current();
        }
    }, []);

    return (
        <Form labelWrap colon={false} {...formProps_} className="fields-form">
            {includedFormItems.map((f) => (
                <Fragment key={f.name}>{<FormItem {...f} />}</Fragment>
            ))}
            {children}
        </Form>
    );
}
