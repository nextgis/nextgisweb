/** @plugin */

import { gettext } from "@nextgisweb/pyramid/i18n";
import { createPanelRegistry } from "@nextgisweb/webmap/panels-manager/registry";

import InfoIcon from "@nextgisweb/icon/material/info";

const msgTitle = gettext("Description");

createPanelRegistry(COMP_ID, () => import("./DescriptionPanel"), {
    title: msgTitle,
    name: "info",
    order: 40,
    menuIcon: <InfoIcon />,
    applyToTinyMap: true,

    isEnabled: (meta) => {
        return !!(meta.content || meta.display?.config.webmapDescription);
    },
});
