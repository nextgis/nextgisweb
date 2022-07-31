import { Form, Input } from "@nextgisweb/gui/antd";

export function TextArea({ form, ...props }) {
    return (
        <Form.Item {...props}>
            <Input.TextArea />
        </Form.Item>
    );
}
