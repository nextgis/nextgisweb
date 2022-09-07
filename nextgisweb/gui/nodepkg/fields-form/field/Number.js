import { Form, InputNumber } from "@nextgisweb/gui/antd";

export function Number({ ...props }) {
    return (
        <Form.Item {...props}>
            <InputNumber />
        </Form.Item>
    );
}
