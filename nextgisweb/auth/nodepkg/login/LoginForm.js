import { observer } from "mobx-react-lite";
import { useEffect, useMemo, useState } from "react";

import { Alert, Button, Form } from "@nextgisweb/gui/antd";
import { FieldsForm } from "@nextgisweb/gui/fields-form";
import { useKeydownListener } from "@nextgisweb/gui/hook";
import { routeURL } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";

import oauth from "../oauth";
import { authStore } from "../store";

import LoginIcon from "@nextgisweb/icon/material/login";

import "./LoginForm.less";

const msgOauth = gettext("Sign in with {}").replace("{}", oauth.name);
const msgTitle = gettext("Sign in to Web GIS");
const msgSignIn = gettext("Sign in");

export const LoginForm = observer((props = {}) => {
    const [creds, setCreds] = useState();

    const form = Form.useForm()[0];
    const queryParams = new URLSearchParams(location.search);
    const nextQueryParam = queryParams.get("next");

    const fields = useMemo(
        () => [
            {
                name: "login",
                placeholder: gettext("Login"),
                required: true,
            },
            {
                name: "password",
                placeholder: gettext("Password"),
                widget: "password",
                required: true,
            },
        ],
        []
    );

    const p = { fields, size: "large", form };

    useEffect(() => {
        if (props && props.onChange) {
            props.onChange(creds);
        }
    }, [creds]);

    const onChange = (e) => {
        setCreds((oldVal) => ({ ...oldVal, ...e.value }));
    };

    const login = async () => {
        try {
            await form.validateFields();
            const resp = await authStore.login(creds);
            if (props.reloadAfterLogin) {
                location.reload();
            } else {
                // Query next param takes precedence over user's home URL.
                const next = nextQueryParam || resp.home_url || location.origin;
                window.open(next, "_self");
            }
        } catch {
            // ignore
        }
    };

    useKeydownListener("enter", () => login());

    const oauthUrl =
        routeURL("auth.oauth") +
        "?" +
        new URLSearchParams({
            next: location.href,
        });

    return (
        <div className="ngw-auth-login-form">
            <h1>{msgTitle}</h1>

            {oauth.enabled && (
                <>
                    <div className="oauth">
                        <Button type="primary" size="large" href={oauthUrl}>
                            {msgOauth}
                        </Button>
                    </div>
                    <div className="separator">
                        <span>{gettext("or using login and password")}</span>
                    </div>
                </>
            )}

            <div className="login-password">
                {authStore.loginError && (
                    <Alert type="error" message={authStore.loginError} />
                )}
                <FieldsForm {...p} onChange={onChange}></FieldsForm>

                <Button
                    type="primary"
                    size="large"
                    loading={authStore.isLogining}
                    onClick={login}
                    icon={<LoginIcon />}
                >
                    {msgSignIn}
                </Button>
            </div>
        </div>
    );
});
