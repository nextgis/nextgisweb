import { SaveOutlined } from "@ant-design/icons";
import { Button, Input, Row, Col } from "@nextgisweb/gui/antd";
import { route } from "@nextgisweb/pyramid/api";
import i18n from "@nextgisweb/pyramid/i18n!";
import ErrorDialog from "ngw-pyramid/ErrorDialog/ErrorDialog";
import { useEffect, useState } from "react";

export function HomePath() {
    const [status, setStatus] = useState("loading");
    const [value, setValue] = useState();

    useEffect(async () => {
        const resp = await route("pyramid.home_path").get();
        setValue(resp.home_path);
        setStatus(null);
    }, []);

    const save = async () => {
        setStatus("saving");
        try {
            await route("pyramid.home_path").put({
                json: { home_path: value || null },
            });
        } catch (err) {
            new ErrorDialog(err).show();
        } finally {
            setStatus(null);
        }
    };

    return (
        <Row>
            <Col flex="auto">
                <Input
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    placeholder="/resource/0"
                />
            </Col>
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
        </Row>
    );
}
