import { useState, useEffect } from "react";
import { Button, Row, Typography, Col, Skeleton, Input } from "@nextgisweb/gui/antd";
import { SaveOutlined } from "@ant-design/icons";
import { route } from "@nextgisweb/pyramid/api";
import ErrorDialog from "ngw-pyramid/ErrorDialog/ErrorDialog";
import i18n from "@nextgisweb/pyramid/i18n!";

export function CORSSettings() {
    const [status, setStatus] = useState("loading");
    const [initial, setInitial] = useState("");
    const [value, setValue] = useState("");

    async function load() {
        const resp = await route("pyramid.cors").get();
        setInitial(resp.allow_origin ? resp.allow_origin.join("\n") : "");
        setStatus(null);
    }

    async function save() {
        setStatus("saving");
        const list = value.split(/\n/).filter((s) => !s.match(/^\s*$/));
        try {
            await route("pyramid.cors").put({
                json: { allow_origin: list || null },
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
        <>
            <Row gutter={[16, 16]}>
                <Col flex="auto">
                    <Input.TextArea
                        defaultValue={initial}
                        onChange={(e) => setValue(e.target.value)}
                        autoSize={{ minRows: 12, maxRows: 12 }}
                        style={{ width: "100%" }}
                    />
                </Col>
                <Col flex="none" span={10}>
                    <Typography.Paragraph>
                        {i18n.gettext("Enter allowed origins for cross domain requests to use HTTP API of this Web GIS on other websites. One origin per line.")}
                    </Typography.Paragraph>
                    <Typography.Paragraph>
                        {i18n.gettext("Please note that different protocols (HTTP and HTTPS) and subdomains (example.com and www.example.com) are different origins. Wildcards are allowed for third-level domains and higher.")}
                    </Typography.Paragraph>
                </Col>
            </Row>
            <Row style={{ marginTop: "1em" }}>
                <Button
                    onClick={save}
                    type="primary"
                    loading={status === "saving"}
                    icon={<SaveOutlined />}
                >
                    {i18n.gettext("Save")}
                </Button>
            </Row>
        </>
    );
}
