import { useEffect, useState } from "react";

import { Col, Row, Space, Typography, message } from "@nextgisweb/gui/antd";
import { LoadingWrapper, SaveButton } from "@nextgisweb/gui/component";
import { Code } from "@nextgisweb/gui/component/code";
import { errorModal } from "@nextgisweb/gui/error";
import { route } from "@nextgisweb/pyramid/api";
import { useRouteGet } from "@nextgisweb/pyramid/hook/useRouteGet";
import { gettext } from "@nextgisweb/pyramid/i18n";

export function CustomCSSForm() {
    const [saving, setSaving] = useState(false);
    const [initial, setInitial] = useState(null);
    const [data, setData] = useState(null);

    const { data: initialData, isLoading } = useRouteGet({
        name: "pyramid.csettings",
        options: { query: { pyramid: "custom_css" } },
    });

    useEffect(() => {
        const value = initialData?.pyramid?.custom_css;
        if (value !== undefined) {
            setInitial(value);
            setData(value);
        }
    }, [initialData]);

    const save = async () => {
        setSaving(true);

        try {
            await route("pyramid.csettings").put({
                json: { pyramid: { custom_css: data } },
            });
        } catch (err) {
            errorModal(err);
        } finally {
            // prettier-ignore
            message.success(gettext("Custom styles saved. Reload the page to get them applied."));
            setSaving(false);
        }
    };

    if (isLoading) {
        return <LoadingWrapper />;
    }

    return (
        <Space direction="vertical" style={{ width: "100%" }}>
            <Row gutter={[16, 16]}>
                <Col span={14} style={{ height: "300px" }}>
                    <Code
                        value={initial}
                        onChange={setData}
                        lang="css"
                        lineNumbers
                    />
                </Col>
                <Col span={10}>
                    <Typography.Paragraph>
                        {gettext(
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
