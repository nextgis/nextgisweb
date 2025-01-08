/** @plugin */
import { gettext } from "@nextgisweb/pyramid/i18n";
import { registry } from "@nextgisweb/webmap/panel/registry";
import type { DisplayConfig } from "@nextgisweb/webmap/type/api";

import { DescriptionStore } from "./DescriptionStore";

import InfoIcon from "@nextgisweb/icon/material/info";

registry.register(COMP_ID, () => import("./DescriptionPanel"), {
    name: "info",
    title: gettext("Description"),
    icon: <InfoIcon />,
    order: 40,
    applyToTinyMap: true,

    storeClass: DescriptionStore,
    isEnabled: ({ config }: { config: DisplayConfig }) => {
        return !!config.webmapDescription;
    },
});
