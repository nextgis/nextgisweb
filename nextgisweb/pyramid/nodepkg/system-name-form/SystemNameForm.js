import { SingleSettingForm } from "@nextgisweb/gui/single-setting-form";
import i18n from "@nextgisweb/pyramid/i18n!pyramid";

const saveSuccesText = i18n.gettext("The system name setting is saved.");

export function SystemNameForm() {
    return <SingleSettingForm model="pyramid.system_name" saveSuccesText={saveSuccesText} settingName="full_name" />;
}
