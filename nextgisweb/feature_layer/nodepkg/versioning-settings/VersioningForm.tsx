import type { FeatureLayerCSettingsUpdate } from "@nextgisweb/feature-layer/type/api";
import { Button, Form, Space, Switch } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { SaveOutlined, WarningOutlined } from "@ant-design/icons";

interface VersioningFormProps {
    onFinish: (values: FeatureLayerCSettingsUpdate) => void;
    initialValues?: FeatureLayerCSettingsUpdate;
    status: string;
}

export const VersioningForm: React.FC<VersioningFormProps> = ({
    onFinish,
    initialValues,
    status,
}) => {
    return (
        <Form initialValues={initialValues} onFinish={onFinish}>
            <Form.Item>
                <Space direction="horizontal">
                    <Form.Item
                        noStyle
                        name="versioning_default"
                        valuePropName="checked"
                    >
                        <Switch />
                    </Form.Item>
                    {gettext("Enable by default")}
                </Space>
            </Form.Item>
            <Button
                htmlType="submit"
                type={"primary"}
                danger={status === "saved-error"}
                icon={
                    status === "saved-error" ? (
                        <WarningOutlined />
                    ) : (
                        <SaveOutlined />
                    )
                }
                loading={status === "saving"}
            >
                {gettext("Save")}
            </Button>
        </Form>
    );
};
