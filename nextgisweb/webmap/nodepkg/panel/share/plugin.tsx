/** @plugin */

import { gettext } from "@nextgisweb/pyramid/i18n";
import { registry } from "@nextgisweb/webmap/panels-manager/registry";

import ShareIcon from "@nextgisweb/icon/material/share";

const msgTitle = gettext("Share");

registry.register(COMP_ID, () => import("./SharePanel"), {
    title: msgTitle,
    name: "share",
    order: 60,
    menuIcon: <ShareIcon />,
});
