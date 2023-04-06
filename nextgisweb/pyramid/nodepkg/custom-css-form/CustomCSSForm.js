import { useState } from "react";

import { Col, Row, Space, Typography, message } from "@nextgisweb/gui/antd";
import { LoadingWrapper, SaveButton } from "@nextgisweb/gui/component";
import { Code } from "@nextgisweb/gui/component/code";
import { errorModal } from "@nextgisweb/gui/error";
import { route } from "@nextgisweb/pyramid/api";
import { useRouteGet } from "@nextgisweb/pyramid/hook/useRouteGet";
import i18n from "@nextgisweb/pyramid/i18n!pyramid";

export function CustomCSSForm() {
    const [saving, setSaving] = useState(false);
    const [editor, setEditor] = useState(null);

    const { data, isLoading } = useRouteGet("pyramid.custom_css", null, {
        query: { format: "json" },
    });

    const save = async () => {
        if (editor) {
            setSaving(true);

            const value = editor.getValue();
            try {
                await route("pyramid.custom_css").put({
                    json: value,
                    query: { format: "json" },
                });
                // prettier-ignore
                message.success(i18n.gettext("Custom styles saved. Reload the page to get them applied."));
            } catch (err) {
                errorModal(err);
            } finally {
                setSaving(false);
            }
        }
    };

    const onEditorReady = (e) => {
        setEditor(e);
    };

    if (isLoading) {
        return <LoadingWrapper />;
    }

    return (
        <Space direction="vertical" style={{ width: "100%" }}>
            <Row gutter={[16, 16]}>
                <Col span={14} style={{ height: "300px" }}>
                    <Code
                        lang="css"
                        lineNumbers
                        whenReady={onEditorReady}
                        value={data}
                    />
                </Col>
                <Col span={10}>
                    <Typography.Paragraph>
                        {i18n.gettext(
                            "Enter custom CSS rules here. They will be used to redefine styles, design for all pages of your Web GIS."
                        )}
                    </Typography.Paragraph>
                </Col>
            </Row>
            <Row>
                <SaveButton onClick={save} loading={saving} />
            </Row>
        </Space>
    );
}
