import { Form, Space } from "@nextgisweb/gui/antd";
import { FormItemProps, InputProps } from "../type";

export function FormItem<P extends InputProps = InputProps>({
    placeholder,
    inputProps,
    disabled,
    prepend,
    append,
    label,
    input,
    ...props
}: FormItemProps<P>) {
    const inputProps_: P = { placeholder, disabled, ...inputProps };

    const propsForInput = {} as P;

    for (const p in inputProps_) {
        const prop = inputProps_[p];

        if (prop !== undefined) {
            propsForInput[p] = prop;
        }
    }

    return (
        <Form.Item label={label}>
            <Space.Compact block>
                {prepend ? prepend : null}
                <Form.Item {...props} noStyle>
                    {input ? input(propsForInput) : null}
                </Form.Item>
                {append ? append : null}
            </Space.Compact>
        </Form.Item>
    );
}
