/** @plugin */
import { gettext } from "@nextgisweb/pyramid/i18n";
import { registry } from "@nextgisweb/webmap/panels-manager/registry";

import LayersIcon from "@nextgisweb/icon/material/layers";

registry.register(COMP_ID, () => import("./LayersPanel"), {
    title: gettext("Layers"),
    name: "layers",
    order: 10,
    menuIcon: <LayersIcon />,
    applyToTinyMap: true,
});
