/** @plugin */
import { gettext } from "@nextgisweb/pyramid/i18n";
import { panelRegistry } from "@nextgisweb/webmap/panel/registry";

import InfoIcon from "@nextgisweb/icon/material/info";

panelRegistry(COMP_ID, {
    widget: () => import("./DescriptionPanel"),
    name: "info",
    title: gettext("Description"),
    icon: <InfoIcon />,
    order: 40,
    applyToTinyMap: true,

    store: () => import("./DescriptionStore"),
    isEnabled: ({ config }) => {
        return !!config.webmapDescription;
    },
});
