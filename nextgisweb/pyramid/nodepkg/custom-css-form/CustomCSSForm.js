import { Col, message, Row, Typography, Space } from "@nextgisweb/gui/antd";
import { LoadingWrapper, SaveButton } from "@nextgisweb/gui/component";
import { Code } from "@nextgisweb/gui/component/code";
import { route } from "@nextgisweb/pyramid/api";
import i18n from "@nextgisweb/pyramid/i18n!pyramid";
import ErrorDialog from "ngw-pyramid/ErrorDialog/ErrorDialog";
import { useEffect, useState } from "react";

export function CustomCSSForm() {
    const [status, setStatus] = useState("loading");
    const [value, setValue] = useState(null);
    const [editor, setEditor] = useState(null);

    useEffect(async () => {
        const data = await route("pyramid.custom_css").get({
            query: { format: "json" },
        });
        setValue(data);
        setStatus(null);
    }, []);

    const save = async () => {
        if (editor) {
            setStatus("saving");

            const value = editor.getValue();
            try {
                await route("pyramid.custom_css").put({
                    json: value,
                    query: { format: "json" },
                });
                // prettier-ignore
                message.success(i18n.gettext("Custom styles saved. Reload the page to get them applied."));
            } catch (err) {
                new ErrorDialog(err).show();
            } finally {
                setStatus(null);
            }
        }
    };

    const onEditorReady = (e) => {
        setEditor(e);
    };

    if (status == "loading") {
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
                        value={value}
                    />
                </Col>
                <Col  span={10}>
                    <Typography.Paragraph>
                        {i18n.gettext(
                            "Enter custom CSS rules here. They will be used to redefine styles, design for all pages of your Web GIS."
                        )}
                    </Typography.Paragraph>
                </Col>
            </Row>
            <Row>
                <SaveButton onClick={save} loading={status === "saving"} />
            </Row>
        </Space>
    );
}
