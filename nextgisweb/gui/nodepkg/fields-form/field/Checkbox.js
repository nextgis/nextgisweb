import { Form, Checkbox as CB } from "@nextgisweb/gui/antd";

export function Checkbox({ form, disabled = false, ...props }) {
    return (
        <Form.Item {...props} valuePropName="checked">
            <CB {...{ disabled }}></CB>
        </Form.Item>
    );
}
