import { useVirtualizer } from "@tanstack/react-virtual";
import { useEffect, useMemo, useRef } from "react";

import { Form } from "@nextgisweb/gui/antd";

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
    initialValues,
    ...formProps
}: FieldsFormProps<P>) {
    const localForm = Form.useForm(form)[0];
    const readyRef = useRef(whenReady);
    const parentRef = useRef(null);

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

    const includedFormItems = useMemo(
        () => fields.filter((f) => f.included ?? true),
        [fields]
    );

    const rowVirtualizer = useVirtualizer({
        count: includedFormItems.length,
        getScrollElement: () => parentRef.current,
        estimateSize: () => 42,
    });

    return (
        <Form
            labelWrap
            colon={false}
            {...modifiedFormProps}
            className="fields-form"
            style={{ width: "100%" }}
        >
            <div
                ref={parentRef}
                style={{
                    height: "400px",
                    overflow: "auto",
                }}
            >
                <div
                    style={{
                        height: `${rowVirtualizer.getTotalSize()}px`,
                        width: "100%",
                        position: "relative",
                    }}
                >
                    {rowVirtualizer.getVirtualItems().map((virtualItem) => {
                        const item = includedFormItems[virtualItem.index];
                        return (
                            <div
                                key={item.name}
                                style={{
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    width: "100%",
                                    transform: `translateY(${virtualItem.start}px)`,
                                }}
                            >
                                <FormItem {...item} />
                            </div>
                        );
                    })}
                </div>
            </div>
            {children}
        </Form>
    );
}
