import { SingleSettingForm } from "@nextgisweb/gui/single-setting-form";
import i18n from "@nextgisweb/pyramid/i18n!pyramid";

const saveSuccesText = i18n.gettext("The home path setting is saved.");

export function HomePath() {
  return (
    <SingleSettingForm
      model="pyramid.home_path"
      settingName="home_path"
      saveSuccesText={saveSuccesText}
      inputProps={{ placeholder: "/resource/0" }}
    />
  );
}
