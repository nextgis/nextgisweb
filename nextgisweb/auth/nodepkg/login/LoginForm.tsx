import { observer } from "mobx-react-lite";
import { useEffect, useMemo, useState } from "react";

import { Alert, Button, Form, Input } from "@nextgisweb/gui/antd";
import { errorModal } from "@nextgisweb/gui/error";
import { FieldsForm } from "@nextgisweb/gui/fields-form";
import type { FormField } from "@nextgisweb/gui/fields-form";
import { useKeydownListener } from "@nextgisweb/gui/hook";
import { BaseAPIError, routeURL } from "@nextgisweb/pyramid/api";
import { gettext, gettextf } from "@nextgisweb/pyramid/i18n";

import oauth from "../oauth";
import { authStore } from "../store";

import type { Credentials, CredsOnChangeOptions, LoginFormProps } from "./type";

import LoginIcon from "@nextgisweb/icon/material/login";

import "./LoginForm.less";

const msgOauth = gettextf("Sign in with {}")(oauth.name);
const msgTitle = gettext("Sign in to Web GIS");
const msgSignIn = gettext("Sign in");

const isLoginLocation = location.pathname === routeURL("auth.login");

export const LoginForm = observer((props: LoginFormProps) => {
    const [creds, setCreds] = useState<Credentials>({});

    const form = Form.useForm()[0];
    const queryParams = new URLSearchParams(location.search);
    const nextQueryParam = queryParams.get("next");

    const fields = useMemo<FormField<keyof Credentials>[]>(
        () => [
            {
                name: "login",
                formItem: <Input placeholder={gettext("Login")} />,
                required: true,
            },
            {
                name: "password",
                formItem: <Input.Password placeholder={gettext("Password")} />,
                required: true,
            },
        ],
        []
    );

    useEffect(() => {
        if (props && props.onChange) {
            props.onChange(creds);
        }
    }, [creds, props]);

    const onChange = (e: CredsOnChangeOptions) => {
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
        } catch (err) {
            // authStore handles BaseAPIError
            if (!(err instanceof BaseAPIError)) {
                errorModal(err);
            }
        }
    };

    useKeydownListener("enter", login);

    let oauthNext;
    if (nextQueryParam) {
        oauthNext = nextQueryParam;
    } else if (!isLoginLocation) {
        oauthNext = location.href;
    }

    const oauthUrl =
        routeURL("auth.oauth") +
        (oauthNext ? "?" + new URLSearchParams({ next: oauthNext }) : "");

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
                <FieldsForm
                    form={form}
                    size="large"
                    fields={fields}
                    onChange={onChange}
                ></FieldsForm>

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

LoginForm.displayName = "LoginForm";
