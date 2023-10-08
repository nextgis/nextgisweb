import { SingleSettingForm } from "@nextgisweb/gui/single-setting-form";
import { gettext } from "@nextgisweb/pyramid/i18n";

const msgSuccess = gettext("The home path setting is saved.");

export function HomePath() {
    return (
        <SingleSettingForm
            model="pyramid.home_path"
            settingName="home_path"
            saveSuccesText={msgSuccess}
            inputProps={{ placeholder: "/resource/0" }}
        />
    );
}
