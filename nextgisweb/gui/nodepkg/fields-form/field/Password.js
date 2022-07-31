import { Form, Input } from "@nextgisweb/gui/antd";

export function Password({ form, ...props }) {
    return (
        <Form.Item {...props}>
            <Input.Password />
        </Form.Item>
    );
}
