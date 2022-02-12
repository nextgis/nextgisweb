import { Form, Select as AntdSelect } from "@nextgisweb/gui/antd";


export function Select({ choices, ...props }) {
    return (
        <Form.Item {...props}>
            <AntdSelect {...props}>
                {choices.map(({ label, value, ...optionProps }) => (
                    <AntdSelect.Option key={value} value={value} {...optionProps}>
                        {label}
                    </AntdSelect.Option>
                ))}
            </AntdSelect>
        </Form.Item>
    );
}
