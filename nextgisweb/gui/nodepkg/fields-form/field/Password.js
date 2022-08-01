import { Form, Input } from "@nextgisweb/gui/antd";

export function Password({ form, autoComplete, placeholder, ...props }) {
    const inputProps = { autoComplete, placeholder };

    return (
        <Form.Item {...props}>
            <Input.Password {...inputProps} />
        </Form.Item>
    );
}
