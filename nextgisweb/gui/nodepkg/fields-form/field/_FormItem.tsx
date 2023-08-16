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
    const combinedProps: P = {
        placeholder,
        disabled,
        ...(inputProps || {}),
    } as P;

    const propsForInput = {} as P;

    for (const p in combinedProps) {
        const prop = combinedProps[p];

        if (prop !== undefined) {
            propsForInput[p] = prop;
        }
    }

    return (
        <Form.Item label={label}>
            <Space.Compact block>
                {prepend && prepend}
                <Form.Item {...props} noStyle>
                    {input && input(propsForInput)}
                </Form.Item>
                {append && append}
            </Space.Compact>
        </Form.Item>
    );
}
