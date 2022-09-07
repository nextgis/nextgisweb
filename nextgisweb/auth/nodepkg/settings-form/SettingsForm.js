import PropTypes from "prop-types";
import { useEffect, useState, useMemo } from "react";
import { message, Form, Button } from "@nextgisweb/gui/antd";
import { ContentBox, LoadingWrapper } from "@nextgisweb/gui/component";
import { FieldsForm, LanguageSelect } from "@nextgisweb/gui/fields-form";
import { route, routeURL } from "@nextgisweb/pyramid/api";
import i18n from "@nextgisweb/pyramid/i18n!auth";
import { errorModal } from "@nextgisweb/gui/error";
import oauth from "../oauth";

function OAuthStatus({ oauthSubject }) {
    if (oauthSubject) {
        return (
            <>
                {i18n.gettext("Account bound")} <span>({oauthSubject})</span>
            </>
        );
    } else if (oauth.bind) {
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

OAuthStatus.propTypes = {
    oauthSubject: PropTypes.string,
};

export function SettingsForm() {
    const [status, setStatus] = useState("loading");
    const [profile, setProfile] = useState(null);
    const fields = useMemo(() => {
        const result = [];

        result.push({
            name: "language",
            widget: LanguageSelect,
            loading: status === "saved",
            label: i18n.gettext("Language"),
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
    const initialValues = {
        language: profile.language,
    };
    return (
        <ContentBox>
            <FieldsForm
                {...p}
                onChange={onChange}
                initialValues={initialValues}
            ></FieldsForm>
        </ContentBox>
    );
}
