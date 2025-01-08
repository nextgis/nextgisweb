/** @plugin */

import { gettext } from "@nextgisweb/pyramid/i18n";
import { registry } from "@nextgisweb/webmap/panels-manager/registry";

import ShareIcon from "@nextgisweb/icon/material/share";

registry.register(COMP_ID, () => import("./SharePanel"), {
    name: "share",
    title: gettext("Share"),
    icon: <ShareIcon />,
    order: 60,
});
