/** @plugin */

import { gettext } from "@nextgisweb/pyramid/i18n";
import { registry } from "@nextgisweb/webmap/panels-manager/registry";

import { IdentifyStore } from "./IdentifyStore";

import IdentifyIcon from "@nextgisweb/icon/material/arrow_selector_tool";

registry.register(
    COMP_ID,
    () => import("./IdentificationPanel/IdentificationPanel"),
    {
        title: gettext("Identify"),
        name: "identify",
        order: 15,
        menuIcon: <IdentifyIcon />,
        applyToTinyMap: true,
        storeClass: IdentifyStore,
    }
);
