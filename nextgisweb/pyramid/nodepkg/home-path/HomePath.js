import { SingleSettingForm } from "@nextgisweb/gui/single-setting-form";

export function HomePath() {
    return (
        <SingleSettingForm
            model="pyramid.home_path"
            settingName="home_path"
            inputProps={{ placeholder: "/resource/0" }}
        />
    );
}
