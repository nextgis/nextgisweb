import { ModelLogoForm } from "@nextgisweb/gui/model-logo-form";
import { gettext } from "@nextgisweb/pyramid/i18n";

const msgHelp = [
    gettext("We recommend height of 45 px and width of up to 200 px."),
    gettext("Only PNG and SVG images are supported."),
].join(" ");

export function LogoForm() {
    return (
        <ModelLogoForm
            component="pyramid"
            model="pyramid.csettings"
            settingName="header_logo"
            messages={{ helpText: msgHelp }}
        />
    );
}
