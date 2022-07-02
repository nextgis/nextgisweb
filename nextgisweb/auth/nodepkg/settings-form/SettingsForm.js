import { useEffect, useState, useMemo } from "react";
import { message, Form, Button } from "@nextgisweb/gui/antd";
import { ContentBox, LoadingWrapper } from "@nextgisweb/gui/component";
import { FieldsForm, LanguageSelect } from "@nextgisweb/gui/fields-form";
import { route, routeURL } from "@nextgisweb/pyramid/api";
import settings from "@nextgisweb/pyramid/settings!auth";
import i18n from "@nextgisweb/pyramid/i18n!auth";
import { errorModal } from "@nextgisweb/gui/error";

const oauthEnabled = settings.oauth.enabled;
const oauthDN = settings.oauth.display_name;
const oauthBind = settings.oauth.bind;

function OAuthStatus({ oauthSubject }) {
    if (oauthSubject) {
        return (
            <>
                {i18n.gettext("Account bound")} <span>({oauthSubject})</span>
            </>
        );
    } else if (oauthBind) {
        const bindUrl =
            routeURL("auth.oauth") +
            "?" +
            new URLSearchParams([
                ["bind", "1"],
                ["next", window.location],
            ]);
        return <Button href={bindUrl}>{i18n.gettext("Bind account")}</Button>;
    } else {
        return <>{i18n.gettext("Account not bound")}</>;
    }
}

export function SettingsForm({ id }) {
    const [status, setStatus] = useState("loading");
    const [profile, setProfile] = useState(null);
    const fields = useMemo(() => {
        const result = [];

        result.push({
            name: "language",
            label: i18n.gettext("Language"),
            widget: LanguageSelect,
            loading: status === "saved",
        });

        if (oauthEnabled) {
            result.push({
                name: "oauth_subject",
                label: oauthDN,
                widget: ({ name, ...props }) => (
                    <Form.Item {...props}>
                        <OAuthStatus oauthSubject={profile.oauth_subject} />
                    </Form.Item>
                ),
            });
        }

        return result;
    }, [status, profile]);

    useEffect(async () => {
        try {
            const resp = await route("auth.profile").get();
            setProfile(resp);
        } catch {
            // ignore error
        } finally {
            setStatus(null);
        }
    }, []);

    const p = { fields };

    const onChange = async ({ value: json }) => {
        setStatus("saving");
        try {
            await route("auth.profile").put({ json });
            message.success(i18n.gettext("Saved"));
        } catch (err) {
            errorModal(err);
        } finally {
            setStatus(null);
        }
    };
    if (status === "loading") {
        return <LoadingWrapper />;
    }

    return (
        <ContentBox>
            <FieldsForm
                {...p}
                onChange={onChange}
                initialValues={{ language: profile.language }}
            ></FieldsForm>
        </ContentBox>
    );
}
