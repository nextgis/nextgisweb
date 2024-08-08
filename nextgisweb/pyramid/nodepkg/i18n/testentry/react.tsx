/** @testentry react */

import { SvgIcon } from "@nextgisweb/gui/svg-icon";
import { gettext, gettextf } from "@nextgisweb/pyramid/i18n";

const templateReactNodes = gettextf("Fot this task try {icon} {serviceName}");

const Component = templateReactNodes({
    icon: <SvgIcon icon={"rescls-wfsserver_service"} />,
    serviceName: <b>{gettext("WFS connection")}</b>,
});

function InterpolationWithReactNodeTest() {
    return Component;
}

export default InterpolationWithReactNodeTest;
