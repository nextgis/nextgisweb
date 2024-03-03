import { useMemo, useState } from "react";

import {
    Col,
    Form,
    Input,
    Row,
    Typography,
    message,
} from "@nextgisweb/gui/antd";
import { LoadingWrapper, SaveButton } from "@nextgisweb/gui/component";
import { errorModal } from "@nextgisweb/gui/error";
import { route } from "@nextgisweb/pyramid/api";
import { useRouteGet } from "@nextgisweb/pyramid/hook/useRouteGet";
import { gettext } from "@nextgisweb/pyramid/i18n";

// prettier-ignore
const [msgHelp, msgInfo] = [
    gettext("Enter allowed origins for cross domain requests to use HTTP API of this Web GIS on other websites. One origin per line."),
    gettext("Please note that different protocols (HTTP and HTTPS) and subdomains (example.com and www.example.com) are different origins. Wildcards are allowed for third-level domains and higher."),
];

// prettier-ignore
const ORIGIN_RE = /^https?:\/\/(?:(\*\.)?([_a-z-][_a-z0-9-]*\.)+([_a-z-][_a-z0-9-]*)\.?|([_a-z-][_a-z0-9-]*)|(((25[0-5]|(2[0-4]|1\d|[1-9]|)\d)\.?\b){4}))(:([1-9]|[1-9]\d{1,3}|[1-5]\d{4}|6[0-4]\d{3}|65[0-4]\d{2}|655[0-2]\d|6553[0-5]))?\/?$/g;

export function CORSSettings(props) {
    const [form] = Form.useForm();
    const [status, setStatus] = useState(null);

    const corsRoute = useRouteGet({
        name: "pyramid.csettings",
        options: { "query": { pyramid: "allow_origin" } },
    });

    const allowOriginInitial = useMemo(() => {
        const allowOrigin =
            corsRoute.data && corsRoute.data.pyramid.allow_origin;
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
                await route("pyramid.csettings").put({
                    json: { pyramid: { allow_origin: list || null } },
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
        const origins = val.split(/\r?\n/).map((x) => x.trim());
        return origins.filter(Boolean).every((x) => x.match(ORIGIN_RE));
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
                        disabled={props.readonly}
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
            {!props.readonly ? (
                <Row>
                    <SaveButton onClick={save} loading={status === "saving"} />
                </Row>
            ) : null}
        </>
    );
}
