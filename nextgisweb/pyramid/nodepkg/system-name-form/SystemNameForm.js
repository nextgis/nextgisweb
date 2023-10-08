import { SingleSettingForm } from "@nextgisweb/gui/single-setting-form";
import { gettext } from "@nextgisweb/pyramid/i18n";

const msgSaved = gettext("The system name setting is saved.");

export function SystemNameForm() {
    return (
        <SingleSettingForm
            model="pyramid.system_name"
            saveSuccesText={msgSaved}
            settingName="full_name"
        />
    );
}
