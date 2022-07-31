import { Form, InputNumber } from "@nextgisweb/gui/antd";

export function Number({ form, ...props }) {
    return (
        <Form.Item {...props}>
            <InputNumber />
        </Form.Item>
    );
}
