import { useMemo, useState } from "react";

import { Button, Form, message } from "@nextgisweb/gui/antd";
import { LoadingWrapper } from "@nextgisweb/gui/component";
import { errorModal } from "@nextgisweb/gui/error";
import type { ApiError } from "@nextgisweb/gui/error/type";
import { FieldsForm, LanguageSelect } from "@nextgisweb/gui/fields-form";
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

    const fields = useMemo<FormField[]>(() => {
        const result = [];

        result.push({
            name: "language",
            widget: LanguageSelect,
            loading: isSaving,
            label: gettext("Language"),
        });

        if (oauth.enabled && profile) {
            result.push({
                name: "oauth_subject",
                label: oauth.name,
                widget: ({ ...props }) => (
                    <Form.Item {...props}>
                        <OAuthStatus oauthSubject={profile.oauth_subject} />
                    </Form.Item>
                ),
            });
        }

        return result;
    }, [profile, isSaving]);
    const onChange = async ({ value: json }: FormOnChangeOptions) => {
        setSaving(true);
        try {
            await route("auth.profile").put({ json });
            message.success(gettext("Saved"));
        } catch (err) {
            errorModal(err as ApiError);
        } finally {
            setSaving(false);
        }
    };
    const initialValues = {
        language: profile ? profile.language : null,
    };
    return (
        <LoadingWrapper loading={isLoading} rows={fields.length} title={false}>
            <FieldsForm {...{ fields, onChange, initialValues }} />
        </LoadingWrapper>
    );
}
