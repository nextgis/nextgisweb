/** @plugin */
import { gettext } from "@nextgisweb/pyramid/i18n";
import { registry } from "@nextgisweb/webmap/panels-manager/registry";

import PrintIcon from "@nextgisweb/icon/material/print";

registry.register(COMP_ID, () => import("./PrintPanel"), {
    title: gettext("Print map"),
    name: "print",
    order: 70,
    menuIcon: <PrintIcon />,
});
