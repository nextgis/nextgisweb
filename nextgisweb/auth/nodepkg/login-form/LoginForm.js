import LoginIcon from "@material-icons/svg/login";
import { Alert, Button, Form } from "@nextgisweb/gui/antd";
import { FieldsForm } from "@nextgisweb/gui/fields-form";
import { useKeydownListener } from "@nextgisweb/gui/hook";
import { routeURL } from "@nextgisweb/pyramid/api";
import i18n from "@nextgisweb/pyramid/i18n!auth";
import settings from "@nextgisweb/pyramid/settings!auth";
import { observer } from "mobx-react-lite";
import { PropTypes } from "prop-types";
import { useEffect, useMemo, useState } from "react";
import { authStore } from "../store";

const oauthText = i18n.gettext("Sign in with OAuth");
const titleText = i18n.gettext("Sign in to Web GIS");
const loginText = i18n.gettext("Sign in");

export const LoginForm = observer((props = {}) => {
    const [creds, setCreds] = useState();

    const form = Form.useForm()[0];
    const queryParams = new URLSearchParams(location.search);
    const nextQueryParam = queryParams.get("next");

    const fields = useMemo(() => [
        {
            name: "login",
            placeholder: i18n.gettext("Login"),
            required: true,
        },
        {
            name: "password",
            placeholder: i18n.gettext("Password"),
            widget: "password",
            required: true,
        },
    ]);

    const p = { fields, size: "large", form };

    useEffect(() => {
        if (props && props.onChange) {
            props.onChange(creds);
        }
    }, [creds]);

    const onChange = (e) => {
        setCreds((oldVal) => ({ ...oldVal, ...e.value }));
    };

    useKeydownListener("enter", () => login());

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

    const oauthUrl =
        routeURL("auth.oauth") +
        "?" +
        new URLSearchParams({
            next: location.href,
        });

    return (
        <div style={{ textAlign: "center" }}>
            <h1>{titleText}</h1>

            {settings.oauth.enabled && (
                <Button
                    type="primary"
                    href={oauthUrl}
                    style={{ marginBottom: "1em" }}
                >
                    {oauthText}
                </Button>
            )}
            {authStore.loginError && (
                <div style={{ marginBottom: "1em" }}>
                    <Alert type="error" message={authStore.loginError} />
                </div>
            )}
            <FieldsForm {...p} onChange={onChange}></FieldsForm>

            <Button
                type="primary"
                size="large"
                loading={authStore.isLogining}
                onClick={login}
                icon={<LoginIcon />}
            >
                {loginText}
            </Button>
        </div>
    );
});

LoginForm.propTypes = {
    onChange: PropTypes.func,
    reloadAfterLogin: PropTypes.bool,
    form: PropTypes.object,
};
