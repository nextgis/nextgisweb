import { useMemo, useState } from "react";

import {
    Col,
    Form,
    Input,
    message,
    Row,
    Typography,
} from "@nextgisweb/gui/antd";
import { LoadingWrapper, SaveButton } from "@nextgisweb/gui/component";
import { errorModal } from "@nextgisweb/gui/error";
import { route } from "@nextgisweb/pyramid/api";
import { useRouteGet } from "@nextgisweb/pyramid/hook/useRouteGet";
import { gettext } from "@nextgisweb/pyramid/i18n";

// prettier-ignore
const msgHelp = gettext("Enter allowed origins for cross domain requests to use HTTP API of this Web GIS on other websites. One origin per line."),
    msgInfo = gettext("Please note that different protocols (HTTP and HTTPS) and subdomains (example.com and www.example.com) are different origins. Wildcards are allowed for third-level domains and higher.");

export function CORSSettings() {
    const [form] = Form.useForm();
    const [status, setStatus] = useState(null);

    const corsRoute = useRouteGet({ name: "pyramid.cors" });

    const allowOriginInitial = useMemo(() => {
        const allowOrigin = corsRoute.data && corsRoute.data.allow_origin;
        return allowOrigin ? allowOrigin.join("\n") : "";
    }, [corsRoute.data]);

    async function save() {
        try {
            setStatus("saving");
            const { cors } = await form.validateFields();
            try {
                const list = cors
                    .split(/\n/)
                    .filter((s) => !s.match(/^\s*$/))
                    .map((c) => c.trim());
                await route("pyramid.cors").put({
                    json: { allow_origin: list || null },
                });
                message.success(gettext("CORS settings updated"));
            } catch (err) {
                errorModal(err);
            }
        } catch {
            message.error(gettext("Fix the form errors first"));
        } finally {
            setStatus(null);
        }
    }

    const validCORSRule = (val) => {
        const regex = /^(https?):\/\/(\*\.)?([\w\-.]{3,})(:\d{2,5})?\/?$/gi;
        const origins = val.split(/\r?\n/).map((x) => x.trim());
        return origins.filter(Boolean).every((x) => x.match(regex));
    };

    const rules = [
        () => ({
            validator(_, value) {
                if (value && !validCORSRule(value)) {
                    return Promise.reject(
                        new Error(gettext("The value entered is not valid"))
                    );
                }
                return Promise.resolve();
            },
        }),
    ];

    if (corsRoute.isLoading) {
        return <LoadingWrapper loading={true} />;
    }

    return (
        <>
            <Row gutter={[16, 16]}>
                <Col flex="auto">
                    <Form
                        initialValues={{ cors: allowOriginInitial }}
                        form={form}
                    >
                        <Form.Item rules={rules} name="cors">
                            <Input.TextArea
                                autoSize={{ minRows: 12, maxRows: 12 }}
                                style={{ width: "100%" }}
                            />
                        </Form.Item>
                    </Form>
                </Col>
                <Col flex="none" span={10}>
                    <Typography.Paragraph>{msgHelp}</Typography.Paragraph>
                    <Typography.Paragraph>{msgInfo}</Typography.Paragraph>
                </Col>
            </Row>
            <Row>
                <SaveButton onClick={save} loading={status === "saving"} />
            </Row>
        </>
    );
}
