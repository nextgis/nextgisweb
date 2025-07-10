import { useMemo, useState } from "react";

import { Button, Input, message } from "@nextgisweb/gui/antd";
import { LoadingWrapper } from "@nextgisweb/gui/component";
import { LanguageSelect } from "@nextgisweb/gui/component/language-select";
import { errorModal } from "@nextgisweb/gui/error";
import { FieldsForm } from "@nextgisweb/gui/fields-form";
import type {
    FormField,
    FormOnChangeOptions,
} from "@nextgisweb/gui/fields-form";
import { route, routeURL } from "@nextgisweb/pyramid/api";
import { useRouteGet } from "@nextgisweb/pyramid/hook";
import { gettext } from "@nextgisweb/pyramid/i18n";

import oauth from "../oauth";

interface OauthStatusProps {
    oauthSubject: string | null;
}

function OAuthStatus({ oauthSubject }: OauthStatusProps) {
    if (oauthSubject) {
        return (
            <>
                {gettext("Account bound")} <span>({oauthSubject})</span>
            </>
        );
    } else if (oauth.bind) {
        const bindUrl =
            routeURL("auth.oauth") +
            "?" +
            new URLSearchParams([
                ["bind", "1"],
                ["next", window.location.toString()],
            ]);
        return <Button href={bindUrl}>{gettext("Bind account")}</Button>;
    } else {
        return <>{gettext("Account not bound")}</>;
    }
}

export function SettingsForm() {
    const [isSaving, setSaving] = useState(false);
    const { data: profile, isLoading } = useRouteGet("auth.profile");

    const [messageApi, contextHolder] = message.useMessage();

    const fields = useMemo<FormField[]>(() => {
        const result = [];

        result.push({
            name: "keyname",
            label: gettext("Login"),
            formItem: <Input readOnly={true} />,
        });

        result.push({
            name: "language",
            formItem: <LanguageSelect />,
            loading: isSaving,
            label: gettext("Language"),
        });

        if (oauth.enabled && profile) {
            result.push({
                name: "oauth_subject",
                label: oauth.name,
                formItem: <OAuthStatus oauthSubject={profile.oauth_subject} />,
            });
        }
        return result;
    }, [profile, isSaving]);
    const onChange = async ({ value: json }: FormOnChangeOptions) => {
        setSaving(true);
        try {
            await route("auth.profile").put({ json });
            messageApi.success(gettext("Saved"));
        } catch (err) {
            errorModal(err);
        } finally {
            setSaving(false);
        }
    };
    const initialValues = {
        keyname: profile ? profile.keyname : null,
        language: profile ? profile.language : null,
    };
    return (
        <LoadingWrapper loading={isLoading} rows={fields.length} title={false}>
            {contextHolder}
            <FieldsForm
                fields={fields}
                onChange={onChange}
                initialValues={initialValues}
            />
        </LoadingWrapper>
    );
}
