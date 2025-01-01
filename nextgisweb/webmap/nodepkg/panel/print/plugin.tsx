/** @plugin */

import { gettext } from "@nextgisweb/pyramid/i18n";
import { createPanelRegistry } from "@nextgisweb/webmap/panels-manager/registry";

import PrintIcon from "@nextgisweb/icon/material/print";

const msgTitle = gettext("Print map");

createPanelRegistry(COMP_ID, () => import("./PrintPanel"), {
    title: msgTitle,
    name: "print",
    order: 70,
    menuIcon: <PrintIcon />,
});
