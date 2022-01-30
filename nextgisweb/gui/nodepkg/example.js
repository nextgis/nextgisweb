/** @entrypoint */
import i18n from "@nextgisweb/pyramid/i18n!";

export default function ExampleApplication() {
    return (
        <>
            <h2>Regular buttons</h2>

            <Space>
                <Button type="primary">Primary</Button>
                <Button type="secondary">Default</Button>
                <Button type="dashed">Dashed</Button>
                <Button type="secondary" disabled>Disabled</Button>
            </Space>

            <h2>Danger buttons</h2>

            <Space>
                <Button type="primary" danger>Primary</Button>
                <Button type="secondary" danger>Default</Button>
                <Button type="dashed" danger>Dashed</Button>
                <Button type="secondary" danger disabled>Disabled</Button>
            </Space>

            <h2>Form</h2>

            <Form
                labelCol={{ span: 6 }}
                wrapperCol={{ span: 18 }}
                labelAlign="left"
            >
                <Form.Item label="Input">
                    <Input />
                </Form.Item>
                <Form.Item label="Select">
                    <Select>
                        <Select.Option value="1">Option 1</Select.Option>
                        <Select.Option value="2">Option 2</Select.Option>
                        <Select.Option value="3">Option 3</Select.Option>
                    </Select>
                </Form.Item>
                <Form.Item label="Date picker">
                    <DatePicker />
                </Form.Item>
                <Form.Item wrapperCol={{ offset: 6, span: 18 }}>
                    <Space>
                        <Button type="primary">Submit</Button>
                        <Button>Reset</Button>
                    </Space>
                </Form.Item>
            </Form>

            <h2>Internationalization</h2>

            <Button>{i18n.gettext("Internationalization test")}</Button>

            <h2>Calendar</h2>

            <div style={{ width: "40em" }}>
                <Calendar fullscreen={false} />
            </div>

        </>
    );
}
