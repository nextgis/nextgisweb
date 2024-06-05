import { SingleSettingForm } from "@nextgisweb/gui/single-setting-form";
import { gettext } from "@nextgisweb/pyramid/i18n";

const msgSaved = gettext("The system name setting is saved.");

export function SystemNameForm() {
    return (
        <SingleSettingForm
            component="pyramid"
            model="pyramid.csettings"
            saveSuccessText={msgSaved}
            settingName="full_name"
        />
    );
}
