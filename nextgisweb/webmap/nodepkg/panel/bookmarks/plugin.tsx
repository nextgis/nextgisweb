/** @plugin */
import { gettext } from "@nextgisweb/pyramid/i18n";
import { registry } from "@nextgisweb/webmap/panels-manager/registry";
import type { DisplayConfig } from "@nextgisweb/webmap/type/api";

import BookmarkIcon from "@nextgisweb/icon/material/bookmark";

const msgTitle = gettext("Bookmarks");

registry.register(COMP_ID, () => import("./BookmarksPanel"), {
    title: msgTitle,
    name: "bookmark",
    order: 50,
    menuIcon: <BookmarkIcon />,
    applyToTinyMap: true,

    isEnabled: ({ config }: { config: DisplayConfig }) => {
        return typeof config.bookmarkLayerId === "number";
    },
});
