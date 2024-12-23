/** @plugin */

import { gettext } from "@nextgisweb/pyramid/i18n";
import { registry } from "@nextgisweb/webmap/panels-manager/registry";

import SearchIcon from "@nextgisweb/icon/material/search";

registry.register(COMP_ID, () => import("./SearchPanel"), {
    title: gettext("Search"),
    name: "search",
    order: 20,
    menuIcon: <SearchIcon />,
    applyToTinyMap: true,
});
