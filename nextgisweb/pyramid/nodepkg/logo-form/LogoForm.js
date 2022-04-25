import { ModelLogoForm } from "@nextgisweb/gui/model-logo-form";

import i18n from "@nextgisweb/pyramid/i18n!pyramid";

const helpText = i18n.gettext(
    "We recommend height of 45 px and width of up to 200 px."
);

export function LogoForm() {
    return <ModelLogoForm model="pyramid.logo" messages={{ helpText }} />;
}
