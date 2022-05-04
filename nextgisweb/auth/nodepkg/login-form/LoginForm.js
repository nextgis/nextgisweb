import { Button, Alert } from "@nextgisweb/gui/antd";
import { FieldsForm } from "@nextgisweb/gui/fields-form";
import { routeURL } from "@nextgisweb/pyramid/api";
import i18n from "@nextgisweb/pyramid/i18n!auth";
import settings from "@nextgisweb/pyramid/settings!auth";
import { observer } from "mobx-react-lite";
import { PropTypes } from "prop-types";
import { useEffect, useMemo, useState } from "react";
import { authStore } from "../store";

const oauthText = i18n.gettext("Sign in with OAuth");

export const LoginForm = observer((props = {}) => {
    const [creds, setCreds] = useState();

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

    const p = { fields, size: "large", form: props.form };

    useEffect(() => {
        if (props && props.onChange) {
            props.onChange(creds);
        }
    }, [creds]);

    const onChange = (e) => {
        setCreds((oldVal) => ({ ...oldVal, ...e.value }));
    };

    const oauthUrl =
        routeURL("auth.oauth") +
        "?" +
        new URLSearchParams({
            next: location.href,
        });

    return (
        <>
            {settings.oauth.enabled && (
                <div style={{ marginBottom: "1em" }}>
                    <Button type="primary" href={oauthUrl}>
                        {oauthText}
                    </Button>
                </div>
            )}
            {authStore.loginError && (
                <div style={{ marginBottom: "1em" }}>
                    <Alert type="error" message={authStore.loginError} />
                </div>
            )}
            <FieldsForm {...p} onChange={onChange}></FieldsForm>
        </>
    );
});

LoginForm.propTypes = {
    onChange: PropTypes.func,
    form: PropTypes.object,
};
