/** @plugin */

import { gettext } from "@nextgisweb/pyramid/i18n";
import { createPanelRegistry } from "@nextgisweb/webmap/panels-manager/registry";

import LayersIcon from "@nextgisweb/icon/material/layers";

const msgTitle = gettext("Layers");

createPanelRegistry(COMP_ID, () => import("./LayersPanel"), {
    title: msgTitle,
    name: "layers",
    order: 10,
    menuIcon: <LayersIcon />,
    applyToTinyMap: true,
});
