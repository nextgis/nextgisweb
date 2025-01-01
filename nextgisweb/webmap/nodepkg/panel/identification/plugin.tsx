/** @plugin */

import { gettext } from "@nextgisweb/pyramid/i18n";
import { createPanelRegistry } from "@nextgisweb/webmap/panels-manager/registry";

import IdentifyIcon from "@nextgisweb/icon/material/arrow_selector_tool";

const msgTitle = gettext("Identify");

createPanelRegistry(
    COMP_ID,
    () => import("./IdentificationPanel/IdentificationPanel"),
    {
        title: msgTitle,
        name: "identify",
        order: 15,
        menuIcon: <IdentifyIcon />,
        applyToTinyMap: true,
    }
);
