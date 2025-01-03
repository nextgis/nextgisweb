/** @plugin */
import { gettext } from "@nextgisweb/pyramid/i18n";
import { registry } from "@nextgisweb/webmap/panels-manager/registry";
import type { DisplayConfig } from "@nextgisweb/webmap/type/api";

import InfoIcon from "@nextgisweb/icon/material/info";

registry.register(COMP_ID, () => import("./DescriptionPanel"), {
    title: gettext("Description"),
    name: "info",
    order: 40,
    menuIcon: <InfoIcon />,
    applyToTinyMap: true,

    isEnabled: ({ config }: { config: DisplayConfig }) => {
        return !!config.webmapDescription;
    },
});
