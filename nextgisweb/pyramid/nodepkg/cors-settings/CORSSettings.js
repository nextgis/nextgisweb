import {
    Col,
    Form,
    Input,
    message,
    Row,
    Typography,
} from "@nextgisweb/gui/antd";
import { LoadingWrapper, SaveButton } from "@nextgisweb/gui/component";
import { route } from "@nextgisweb/pyramid/api";
import i18n from "@nextgisweb/pyramid/i18n!";
import { errorModal } from "@nextgisweb/gui/error";
import { useEffect, useState } from "react";

export function CORSSettings() {
    const [form] = Form.useForm();
    const [status, setStatus] = useState("loading");
    const [initial, setInitial] = useState("");

    async function load() {
        const resp = await route("pyramid.cors").get();
        setInitial(resp.allow_origin ? resp.allow_origin.join("\n") : "");
        setStatus(null);
    }

    async function save() {
        try {
            const { cors } = await form.validateFields();
            setStatus("saving");
            const list = cors.split(/\n/).filter((s) => !s.match(/^\s*$/));
            try {
                await route("pyramid.cors").put({
                    json: { allow_origin: list || null },
                });
                message.success(i18n.gettext("CORS settings updated"));
            } catch (err) {
                errorModal(err);
            } finally {
                setStatus(null);
            }
        } catch {
            message.error(i18n.gettext("Fix the form errors first"));
        }
    }

    useEffect(() => load(), []);

    const validCORSRule = (val) => {
        const expression =
            /^(https?):\/\/(\*\.)?([\w\-\.]{3,})(:\d{2,5})?\/?$/gi;
        const regex = new RegExp(expression);
        const origins = val.split(/\r?\n/).map((x) => x.trim());
        return origins.filter(Boolean).every((x) => x.match(regex));
    };

    const rules = [
        () => ({
            validator(_, value) {
                if (value && !validCORSRule(value)) {
                    return Promise.reject(
                        new Error(
                            i18n.gettext("The value entered is not valid")
                        )
                    );
                }
                return Promise.resolve();
            },
        }),
    ];

    if (status == "loading") {
        return <LoadingWrapper loading={true} />;
    }

    return (
        <>
            <Row gutter={[16, 16]}>
                <Col flex="auto">
                    <Form initialValues={{ cors: initial }} form={form}>
                        <Form.Item rules={rules} name="cors">
                            <Input.TextArea
                                autoSize={{ minRows: 12, maxRows: 12 }}
                                style={{ width: "100%" }}
                            />
                        </Form.Item>
                    </Form>
                </Col>
                <Col flex="none" span={10}>
                    <Typography.Paragraph>
                        {i18n.gettext(
                            "Enter allowed origins for cross domain requests to use HTTP API of this Web GIS on other websites. One origin per line."
                        )}
                    </Typography.Paragraph>
                    <Typography.Paragraph>
                        {i18n.gettext(
                            "Please note that different protocols (HTTP and HTTPS) and subdomains (example.com and www.example.com) are different origins. Wildcards are allowed for third-level domains and higher."
                        )}
                    </Typography.Paragraph>
                </Col>
            </Row>
            <Row>
                <SaveButton
                    onClick={save}
                    loading={status === "saving"}
                ></SaveButton>
            </Row>
        </>
    );
}
