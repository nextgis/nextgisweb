/** @plugin */

import { lazy } from "react";

import { gettext } from "@nextgisweb/pyramid/i18n";
import { mapControlRegistry } from "@nextgisweb/webmap/display/component/map-panel/registry";
import { hasOlMap } from "@nextgisweb/webmap/ol/util/hasOlMap";

import { getOlMapProps } from "../ol/util/getOlMapProps";

const ToolZoomLazy = lazy(() => import("../map-component/tool/ToolZoom"));
const ToolSwipeLazy = lazy(() => import("../map-component/tool/ToolSwipe"));
const ToolMeasureLazy = lazy(() => import("../map-component/tool/ToolMeasure"));
const ToolViewerInfoLazy = lazy(
  () => import("../map-component/tool/ToolViewerInfo")
);

mapControlRegistry(COMP_ID, {
  key: "zi",
  isEnabled: ({ map }) => hasOlMap(map.adapter),
  order: 10,
  component: ToolZoomLazy,
  label: gettext("Zoom in"),
  position: { inside: "map-toolbar" },
  hideOnMobile: true,
  embeddedShowMode: "customize",
  getProps: (context) => ({
    ...getOlMapProps(context),
    out: false,
    groupId: "zoomingIn",
  }),
});
mapControlRegistry(COMP_ID, {
  key: "zo",
  isEnabled: ({ map }) => hasOlMap(map.adapter),
  order: 20,
  component: ToolZoomLazy,
  label: gettext("Zoom out"),
  position: { inside: "map-toolbar" },
  hideOnMobile: true,
  embeddedShowMode: "customize",
  getProps: (context) => ({
    ...getOlMapProps(context),
    out: true,
    groupId: "zoomingOut",
  }),
});
mapControlRegistry(COMP_ID, {
  key: "sv",
  isEnabled: ({ map }) => hasOlMap(map.adapter),
  order: 30,
  component: ToolSwipeLazy,
  label: gettext("Vertical swipe"),
  position: { inside: "map-toolbar" },
  hideOnMobile: true,
  embeddedShowMode: "customize",
  getProps: (context) => ({
    ...getOlMapProps(context),
    orientation: "vertical" as const,
    groupId: "swipeVertical",
  }),
});
mapControlRegistry(COMP_ID, {
  key: "md",
  isEnabled: ({ map }) => hasOlMap(map.adapter),
  order: 40,
  component: ToolMeasureLazy,
  label: gettext("Measure distance"),
  position: { inside: "map-toolbar" },
  embeddedShowMode: "customize",
  showOnPreview: true,
  getProps: (context) => ({
    ...getOlMapProps(context),
    type: "LineString" as const,
    groupId: "measuringLength",
  }),
});
mapControlRegistry(COMP_ID, {
  key: "ma",
  isEnabled: ({ map }) => hasOlMap(map.adapter),
  order: 50,
  component: ToolMeasureLazy,
  label: gettext("Measure area"),
  position: { inside: "map-toolbar" },
  embeddedShowMode: "customize",
  showOnPreview: true,
  getProps: (context) => ({
    ...getOlMapProps(context),
    type: "Polygon" as const,
    groupId: "measuringArea",
  }),
});
mapControlRegistry(COMP_ID, {
  key: "tv",
  isEnabled: ({ map }) => hasOlMap(map.adapter),
  getProps: getOlMapProps,
  order: 60,
  component: ToolViewerInfoLazy,
  label: gettext("Cursor coordinates / extent"),
  position: { inside: "map-toolbar" },
  hideOnMobile: true,
  showOnPreview: true,
  embeddedShowMode: "customize",
});
