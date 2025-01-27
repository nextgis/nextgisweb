/** @plugin */
import { gettext } from "@nextgisweb/pyramid/i18n";
import { registry } from "@nextgisweb/webmap/panel/registry";

import PrintIcon from "@nextgisweb/icon/material/print";

registry.register(COMP_ID, {
    widget: () => import("./PrintPanel"),
    name: "print",
    title: gettext("Print map"),
    icon: <PrintIcon />,
    order: 70,
});
