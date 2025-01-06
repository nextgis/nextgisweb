/** @plugin */

import { gettext } from "@nextgisweb/pyramid/i18n";
import { createPanelRegistry } from "@nextgisweb/webmap/panels-manager/registry";

import BookmarkIcon from "@nextgisweb/icon/material/bookmark";

const msgTitle = gettext("Bookmarks");

createPanelRegistry(COMP_ID, () => import("./BookmarksPanel"), {
    title: msgTitle,
    name: "bookmark",
    order: 50,
    menuIcon: <BookmarkIcon />,
    applyToTinyMap: true,

    isEnabled: (meta) => {
        return typeof meta.display?.config.bookmarkLayerId === "number";
    },
});
