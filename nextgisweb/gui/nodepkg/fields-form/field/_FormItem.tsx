import isEqual from "lodash-es/isEqual";
import { useMemo, useState } from "react";
import { useEffect } from "react";

import { Form, Space } from "@nextgisweb/gui/antd";

import type { FormItemProps, InputProps } from "../type";

export function FormItem<P extends InputProps = InputProps>({
    placeholder,
    inputProps: inputPropsFromProps,
    disabled,
    prepend,
    append,
    label,
    input: Input,
    ...props
}: FormItemProps<P>) {
    const [inputProps, setInputProps] = useState<P>(
        () => inputPropsFromProps || ({} as P)
    );

    const memoizedInputComponent = useMemo(() => {
        const combinedProps: P = {
            placeholder,
            disabled,
            ...inputProps,
        };

        const propsForInput = {} as P;

        for (const p in combinedProps) {
            const prop = combinedProps[p];

            if (prop !== undefined) {
                propsForInput[p] = prop;
            }
        }

        return Input && <Input {...propsForInput} />;
    }, [disabled, inputProps, Input, placeholder]);

    useEffect(() => {
        if (inputPropsFromProps) {
            setInputProps((old) => {
                if (!isEqual(old, inputPropsFromProps)) {
                    return inputPropsFromProps;
                }
                return old;
            });
        }
    }, [inputPropsFromProps]);

    return (
        <Form.Item label={label}>
            <Space.Compact block>
                {prepend && prepend}
                <Form.Item {...props} noStyle>
                    {memoizedInputComponent}
                </Form.Item>
                {append && append}
            </Space.Compact>
        </Form.Item>
    );
}
