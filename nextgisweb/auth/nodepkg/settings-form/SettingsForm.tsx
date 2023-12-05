import { useEffect, useMemo, useState } from "react";

import { Button, Form, message } from "@nextgisweb/gui/antd";
import { LoadingWrapper } from "@nextgisweb/gui/component";
import { errorModal } from "@nextgisweb/gui/error";
import { FieldsForm, LanguageSelect } from "@nextgisweb/gui/fields-form";
import { route, routeURL } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";

import oauth from "../oauth";

interface AuthProfile {
    oauth_subject?: string | null;
    language?: string | null;
}

interface OauthStatusProps {
    oauthSubject: string;
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
    const [status, setStatus] = useState("loading");
    const [profile, setProfile] = useState<AuthProfile>(null);
    const fields = useMemo(() => {
        const result = [];

        result.push({
            name: "language",
            widget: LanguageSelect,
            loading: status === "saved",
            label: gettext("Language"),
        });

        if (oauth.enabled) {
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
    }, [status, profile]);

    useEffect(() => {
        (async () => {
            try {
                const resp = await route("auth.profile").get<AuthProfile>();
                setProfile(resp);
            } catch {
                // ignore error
            } finally {
                setStatus(null);
            }
        })();
    }, []);

    const onChange = async ({ value: json }) => {
        setStatus("saving");
        try {
            await route("auth.profile").put<AuthProfile>({ json });
            message.success(gettext("Saved"));
        } catch (err) {
            errorModal(err);
        } finally {
            setStatus(null);
        }
    };
    if (status === "loading") {
        return <LoadingWrapper />;
    }
    const initialValues = {
        language: profile.language,
    };
    return <FieldsForm {...{ fields, onChange, initialValues }} />;
}
