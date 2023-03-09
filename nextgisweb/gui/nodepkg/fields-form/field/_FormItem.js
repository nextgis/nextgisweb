import PropTypes from "prop-types";
import { Form, Space } from "@nextgisweb/gui/antd";

export function FormItem({
    placeholder,
    inputProps,
    disabled,
    prepend,
    append,
    label,
    input,
    ...props
}) {
    const inputProps_ = { placeholder, disabled, ...inputProps };

    const propsForInput = {};

    for (const p in inputProps_) {
        const prop = inputProps_[p];
        if (prop !== undefined) {
            propsForInput[p] = prop;
        }
    }

    return (
        <Form.Item label={label}>
            <Space.Compact block >
                {prepend ? prepend : null}
                <Form.Item {...props} noStyle>
                    {input ? input(propsForInput) : null}
                </Form.Item>
                {append ? append : null}
            </Space.Compact>
        </Form.Item>
    );
}

FormItem.propTypes = {
    inputProps: PropTypes.object,
    label: PropTypes.string,
    disabled: PropTypes.bool,
    input: PropTypes.func,
    prepend: PropTypes.node,
    append: PropTypes.node,
    placeholder: PropTypes.string,
};
