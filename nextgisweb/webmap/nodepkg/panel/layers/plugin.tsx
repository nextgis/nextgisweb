/** @plugin */
import { gettext } from "@nextgisweb/pyramid/i18n";
import { registry } from "@nextgisweb/webmap/panels-manager/registry";

import LayersIcon from "@nextgisweb/icon/material/layers";

registry.register(COMP_ID, async () => import("./LayersPanel"), {
    name: "layers",
    title: gettext("Layers"),
    icon: <LayersIcon />,
    order: 10,
    applyToTinyMap: true,
});
