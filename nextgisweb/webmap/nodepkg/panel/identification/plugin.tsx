/** @plugin */

import { gettext } from "@nextgisweb/pyramid/i18n";
import { registry } from "@nextgisweb/webmap/panel/registry";

import { IdentifyStore } from "./IdentifyStore";

import IdentifyIcon from "@nextgisweb/icon/material/arrow_selector_tool";

registry.register(
    COMP_ID,
    () => import("./IdentificationPanel/IdentificationPanel"),
    {
        name: "identify",
        title: gettext("Identify"),
        icon: <IdentifyIcon />,
        order: 15,
        applyToTinyMap: true,

        storeClass: IdentifyStore,
    }
);
