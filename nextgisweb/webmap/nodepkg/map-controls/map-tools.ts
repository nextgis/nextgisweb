/** @plugin */

import { lazy } from "react";

import { gettext } from "@nextgisweb/pyramid/i18n";
import { mapControlRegistry } from "@nextgisweb/webmap/display/component/map-panel/registry";

const ToolZoomLazy = lazy(() => import("../map-component/tool/ToolZoom"));
const ToolSwipeLazy = lazy(() => import("../map-component/tool/ToolSwipe"));
const ToolMeasureLazy = lazy(() => import("../map-component/tool/ToolMeasure"));
const ToolViewerInfoLazy = lazy(
  () => import("../map-component/tool/ToolViewerInfo")
);

mapControlRegistry(COMP_ID, {
  key: "zi",
  order: 10,
  component: ToolZoomLazy,
  label: gettext("Zoom in"),
  position: { inside: "map-toolbar" },
  hideOnMobile: true,
  embeddedShowMode: "customize",
  props: { out: false, groupId: "zoomingIn" },
});
mapControlRegistry(COMP_ID, {
  key: "zo",
  order: 20,
  component: ToolZoomLazy,
  label: gettext("Zoom out"),
  position: { inside: "map-toolbar" },
  hideOnMobile: true,
  embeddedShowMode: "customize",
  props: { out: true, groupId: "zoomingOut" },
});
mapControlRegistry(COMP_ID, {
  key: "sv",
  order: 30,
  component: ToolSwipeLazy,
  label: gettext("Vertical swipe"),
  position: { inside: "map-toolbar" },
  hideOnMobile: true,
  embeddedShowMode: "customize",
  props: { orientation: "vertical", groupId: "swipeVertical" },
});
mapControlRegistry(COMP_ID, {
  key: "md",
  order: 40,
  component: ToolMeasureLazy,
  label: gettext("Measure distance"),
  position: { inside: "map-toolbar" },
  embeddedShowMode: "customize",
  showOnPreview: true,
  props: { type: "LineString", groupId: "measuringLength" },
});
mapControlRegistry(COMP_ID, {
  key: "ma",
  order: 50,
  component: ToolMeasureLazy,
  label: gettext("Measure area"),
  position: { inside: "map-toolbar" },
  embeddedShowMode: "customize",
  showOnPreview: true,
  props: { type: "Polygon", groupId: "measuringArea" },
});
mapControlRegistry(COMP_ID, {
  key: "tv",
  order: 60,
  component: ToolViewerInfoLazy,
  label: gettext("Cursor coordinates / extent"),
  position: { inside: "map-toolbar" },
  hideOnMobile: true,
  showOnPreview: true,
  embeddedShowMode: "customize",
});
