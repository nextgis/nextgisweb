/** @plugin */

import { gettext } from "@nextgisweb/pyramid/i18n";
import { registry } from "@nextgisweb/webmap/panel/registry";

import SearchIcon from "@nextgisweb/icon/material/search";

registry.register(COMP_ID, {
    widget: () => import("./SearchPanel"),
    name: "search",
    title: gettext("Search"),
    icon: <SearchIcon />,
    order: 20,
    applyToTinyMap: true,
});
