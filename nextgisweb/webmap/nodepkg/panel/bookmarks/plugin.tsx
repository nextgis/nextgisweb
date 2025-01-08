/** @plugin */
import { gettext } from "@nextgisweb/pyramid/i18n";
import { registry } from "@nextgisweb/webmap/panels-manager/registry";
import type { DisplayConfig } from "@nextgisweb/webmap/type/api";

import BookmarkIcon from "@nextgisweb/icon/material/bookmark";

registry.register(COMP_ID, () => import("./BookmarksPanel"), {
    name: "bookmark",
    title: gettext("Bookmarks"),
    icon: <BookmarkIcon />,
    order: 50,
    applyToTinyMap: true,

    isEnabled: ({ config }: { config: DisplayConfig }) => {
        return typeof config.bookmarkLayerId === "number";
    },
});
