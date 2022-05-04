import { LoginOutlined } from "@ant-design/icons";
import { Button, Form } from "@nextgisweb/gui/antd";
import { ContentBox } from "@nextgisweb/gui/component";
import { useKeydownListener } from "@nextgisweb/gui/hook";
import i18n from "@nextgisweb/pyramid/i18n!auth";
import { observer } from "mobx-react-lite";
import { useState } from "react";
import LoginForm from "../login-form";
import { authStore } from "../store";

const titleMsg = i18n.gettext("Sign in to Web GIS");
const loginText = i18n.gettext("Sign in");

export const LoginBox = observer(() => {
    const [creds, setCreds] = useState();
    const form = Form.useForm()[0];
    const queryParams = new URLSearchParams(location.search);
    const nextQueryParam = queryParams.get("next");

    useKeydownListener("enter", () => login());

    const login = async () => {
        try {
            await form.validateFields();
            const resp = await authStore.login(creds);
            let nextUrl = resp.next_url || nextQueryParam || location.origin;
            window.open(nextUrl, "_self");
        } catch {
            // ignore
        }
    };

    return (
        <ContentBox style={{ textAlign: "center", width: "350px" }}>
            <h1>{titleMsg}</h1>
            <LoginForm onChange={setCreds} form={form} />
            <Button
                type="primary"
                size="large"
                loading={authStore.isLogining}
                onClick={login}
                icon={<LoginOutlined />}
            >
                {loginText}
            </Button>
        </ContentBox>
    );
});
