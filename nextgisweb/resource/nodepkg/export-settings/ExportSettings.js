import { useState, useEffect } from "react";
import { Radio, Button, Space, Row, Typography, Col, Skeleton } from "antd";
import { SaveOutlined } from "@ant-design/icons";
import { route } from "@nextgisweb/pyramid/api";
import ErrorDialog from "ngw-pyramid/ErrorDialog/ErrorDialog";
import i18n from "@nextgisweb/pyramid/i18n!";

export function ExportSettings() {
    const [status, setStatus] = useState("loading");
    const [value, setValue] = useState(null);

    async function load() {
        const resp = await route("resource.resource_export").get();
        setValue(resp.resource_export);
        setStatus(null);
    }

    async function save() {
        setStatus("saving");
        try {
            await route("resource.resource_export").put({
                json: { resource_export: value },
            });
        } catch (err) {
            new ErrorDialog(err).show();
        } finally {
            setStatus(null);
        }
    }

    useEffect(() => load(), []);

    if (status === "loading") {
        return <Skeleton paragraph={{ rows: 4 }} />;
    }

    return (
        <Space direction="vertical">
            <Typography.Text>
                {i18n.gettext('Select the category of users who can use the "Save as" link to download resource data.')}
            </Typography.Text>
            <Radio.Group
                value={value}
                onChange={(e) => setValue(e.target.value)}
            >
                <Space direction="vertical">
                    <Radio value="data_read">{i18n.gettext('Users with "Data: Read" permission')}</Radio>
                    <Radio value="data_write">{i18n.gettext('Users with "Data: Write" permission')}</Radio>
                    <Radio value="administrators">{i18n.gettext("Administrators")}</Radio>
                </Space>
            </Radio.Group>
            <Row align="middle" style={{ marginTop: "1em" }}>
                <Col flex="none">
                    <Button
                        onClick={save}
                        type="primary"
                        loading={status === "saving"}
                        icon={<SaveOutlined />}
                    >
                        {i18n.gettext("Save")}
                    </Button>
                </Col>
                <Col flex="auto" style={{ marginLeft: "4em" }}>
                    <Typography.Text
                        type="secondary"
                        style={{ marginTop: "8em" }}
                    >
                        {i18n.gettext("* This will not affect REST API use which will continue to be governed by permissions.")}
                    </Typography.Text>
                </Col>
            </Row>
        </Space>
    );
}
