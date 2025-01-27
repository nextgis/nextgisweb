/** @plugin */
import { gettext } from "@nextgisweb/pyramid/i18n";
import { registry } from "@nextgisweb/webmap/panel/registry";

import LayersIcon from "@nextgisweb/icon/material/layers";

registry.register(COMP_ID, {
    widget: () => import("./LayersPanel"),
    name: "layers",
    title: gettext("Layers"),
    icon: <LayersIcon />,
    order: 10,
    applyToTinyMap: true,
});
