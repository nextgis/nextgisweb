import { message } from "@nextgisweb/gui/antd";
import { ContentBox, LoadingWrapper } from "@nextgisweb/gui/component";
import { FieldsForm, LanguageSelect } from "@nextgisweb/gui/fields-form";
import { route } from "@nextgisweb/pyramid/api";
import i18n from "@nextgisweb/pyramid/i18n!auth";
import ErrorDialog from "ngw-pyramid/ErrorDialog/ErrorDialog";
import { useEffect, useState, useMemo } from "react";

export function SettingsForm({ id }) {
  const [status, setStatus] = useState("loading");
  const [profile, setProfile] = useState(null);
  const fields = useMemo(
    () => [
      {
        name: "language",
        label: i18n.gettext("Language"),
        widget: LanguageSelect,
        loading: status === "saved",
      },
    ],
    [status]
  );

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
      new ErrorDialog(err).show();
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
