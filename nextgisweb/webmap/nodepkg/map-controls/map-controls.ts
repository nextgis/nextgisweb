/** @plugin */

import { lazy } from "react";

import { gettext } from "@nextgisweb/pyramid/i18n";
import { mapControlRegistry } from "@nextgisweb/webmap/display/component/map-panel/registry";

const ZoomControlLazy = lazy(
  () => import("../map-component/control/ZoomControl")
);
const RotateControlLazy = lazy(
  () => import("../map-component/control/RotateControl")
);
const IdentifyControlLazy = lazy(
  () => import("../map-component/control/IdentifyControl")
);
const InfoScaleControlLazy = lazy(
  () => import("../map-component/control/InfoScaleControl")
);
const ScaleLineControlLazy = lazy(
  () => import("../map-component/control/ScaleLineControl")
);
const MapToolbarControlLazy = lazy(
  () => import("../map-component/control/MapToolbarControl")
);
const MyLocationControlLazy = lazy(
  () => import("../map-component/control/MyLocationControl")
);
const AttributionControlLazy = lazy(
  () => import("../map-component/control/AttributionControl")
);
const InitialExtentControlLazy = lazy(
  () => import("../map-component/control/InitialExtentControl")
);
const MapLoadingIndicatorControlLazy = lazy(
  () => import("../map-component/control/MapLoadingIndicatorControl")
);

mapControlRegistry(COMP_ID, {
  key: "at",
  order: 1000,
  label: gettext("Attribution toolbar"),
  props: {
    id: "attribution-toolbar",
    direction: "horizontal",
    align: "center",
    gap: 8,
  },
  position: "bottom-right",
  showOnPreview: true,
  embeddedShowMode: "always",
  component: MapToolbarControlLazy,
});

mapControlRegistry(COMP_ID, {
  key: "mt",
  label: gettext("Map toolbar"),
  props: { id: "map-toolbar", direction: "horizontal" },
  position: "bottom-left",
  showOnPreview: true,
  embeddedShowMode: "always",
  component: MapToolbarControlLazy,
});

mapControlRegistry(COMP_ID, {
  key: "z",
  order: 10,
  position: "top-left",
  embeddedShowMode: "always",
  component: ZoomControlLazy,
});

mapControlRegistry(COMP_ID, {
  key: "rot",
  order: 30,
  position: "top-left",
  showOnPreview: true,
  component: RotateControlLazy,
});

mapControlRegistry(COMP_ID, {
  key: "attr",
  order: 30,
  position: { inside: "attribution-toolbar" },
  showOnPreview: true,
  embeddedShowMode: "always",
  component: AttributionControlLazy,
});

mapControlRegistry(COMP_ID, {
  key: "is",
  order: 10,
  label: gettext("Info scale"),
  position: { inside: "attribution-toolbar" },
  hideOnMobile: true,
  embeddedShowMode: "customize",
  component: InfoScaleControlLazy,
});

mapControlRegistry(COMP_ID, {
  key: "sl",
  order: 20,
  label: gettext("Scale line"),
  props: { scaleOptions: { minWidth: 48 } },
  position: { inside: "attribution-toolbar" },
  showOnPreview: true,
  embeddedShowMode: "customize",
  component: ScaleLineControlLazy,
});

mapControlRegistry(COMP_ID, {
  key: "li",
  order: 30,
  label: gettext("Loading indicator"),
  props: {},
  position: { inside: "attribution-toolbar" },
  showOnPreview: true,
  embeddedShowMode: "customize",
  component: MapLoadingIndicatorControlLazy,
});

mapControlRegistry(COMP_ID, {
  key: "ie",
  order: 60,
  label: gettext("Initial extent"),
  position: "top-left",
  embeddedShowMode: "customize",
  component: InitialExtentControlLazy,
});

mapControlRegistry(COMP_ID, {
  key: "ml",
  order: 70,
  label: gettext("Locate me"),
  position: "top-left",
  showOnPreview: true,
  embeddedShowMode: "customize",
  component: MyLocationControlLazy,
});

mapControlRegistry(COMP_ID, {
  key: "id",
  label: gettext("Identification"),
  order: -10,
  props: {
    isDefaultGroupId: true,
    groupId: "identifying",
    label: gettext("Identification"),
  },
  position: { inside: "map-toolbar" },
  embeddedShowMode: "customize",
  component: IdentifyControlLazy,
});
