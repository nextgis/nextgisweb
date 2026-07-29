/** @plugin */

import { lazy } from "react";

import { gettext } from "@nextgisweb/pyramid/i18n";
import { registry } from "@nextgisweb/webmap/panel/registry";

import SearchIcon from "@nextgisweb/icon/material/search";

const SearchPanelLazy = lazy(() => import("./SearchPanel"));

registry.register(COMP_ID, {
  type: "widget",
  widget: SearchPanelLazy,
  name: "search",
  title: gettext("Search"),
  icon: <SearchIcon />,
  order: 20,
  applyToTinyMap: true,
});
