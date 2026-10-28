/** @plugin */
import { lazy } from "react";

import { gettext } from "@nextgisweb/pyramid/i18n";
import { mapControlRegistry } from "@nextgisweb/webmap/display/component/map-panel/registry";

import { adapterPlugin } from "./plugin";

const MapModeControlLazy = lazy(
  () => import("@nextgisweb/webmap/map-component/control/MapModeControl")
);

mapControlRegistry(COMP_ID, {
  key: "map_mode",
  order: 20,
  label: gettext("3D mode"),
  position: "top-left",
  showOnPreview: true,
  isEnabled: ({ map, display }) =>
    !!display || map.canUseMapAdapter(adapterPlugin),
  getProps: () => ({ adapterPlugin }),
  previewPosition: "top-right",
  embeddedShowMode: "customize",
  component: MapModeControlLazy,
});
