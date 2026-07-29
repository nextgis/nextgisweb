/** @plugin */
import { lazy } from "react";

import { gettext } from "@nextgisweb/pyramid/i18n";
import { registry } from "@nextgisweb/webmap/panel/registry";
import type { DisplayConfig } from "@nextgisweb/webmap/type/api";

import BookmarkIcon from "@nextgisweb/icon/material/bookmark";

const BookmarksPanelLazy = lazy(() => import("./BookmarksPanel"));

registry.register(COMP_ID, {
  type: "widget",
  widget: BookmarksPanelLazy,
  name: "bookmark",
  title: gettext("Bookmarks"),
  icon: <BookmarkIcon />,
  order: 50,
  applyToTinyMap: true,

  isEnabled: ({ config }: { config: DisplayConfig }) => {
    return typeof config.bookmarkLayerId === "number";
  },
});
