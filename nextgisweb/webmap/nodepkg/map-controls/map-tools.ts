/** @plugin */

import { gettext } from "@nextgisweb/pyramid/i18n";
import { mapControlRegistry } from "@nextgisweb/webmap/display/component/map-panel/registry";

import { EDITING_ID } from "../constant";

mapControlRegistry(COMP_ID, {
    key: "zi",
    order: 10,
    component: () => import("../map-component/tool/ToolZoom"),
    label: gettext("Zoom in"),
    position: { inside: "map-toolbar" },
    embeddedShowMode: "customize",
    props: { out: false, groupId: "zoomingIn" },
});
mapControlRegistry(COMP_ID, {
    key: "zo",
    order: 20,
    component: () => import("../map-component/tool/ToolZoom"),
    label: gettext("Zoom out"),
    position: { inside: "map-toolbar" },
    embeddedShowMode: "customize",
    props: { out: true, groupId: "zoomingOut" },
});
mapControlRegistry(COMP_ID, {
    key: "md",
    order: 30,
    component: () => import("../map-component/tool/ToolMeasure"),
    label: gettext("Measure distance"),
    position: { inside: "map-toolbar" },
    embeddedShowMode: "customize",
    props: { type: "LineString", groupId: "measuringLength" },
});
mapControlRegistry(COMP_ID, {
    key: "ma",
    order: 40,
    component: () => import("../map-component/tool/ToolMeasure"),
    label: gettext("Measure area"),
    position: { inside: "map-toolbar" },
    embeddedShowMode: "customize",
    props: { type: "Polygon", groupId: "measuringArea" },
});
mapControlRegistry(COMP_ID, {
    key: "sv",
    order: 50,
    component: () => import("../map-component/tool/ToolSwipe"),
    label: gettext("Vertical swipe"),
    position: { inside: "map-toolbar" },
    embeddedShowMode: "customize",
    props: { orientation: "vertical", groupId: "swipeVertical" },
});
mapControlRegistry(COMP_ID, {
    key: "tv",
    order: 60,
    component: () => import("../map-component/tool/ToolViewerInfo"),
    props: {
        label: gettext("Cursor coordinates / extent"),
    },
    position: { inside: "map-toolbar" },
    embeddedShowMode: "customize",
});
mapControlRegistry(COMP_ID, {
    key: "ed",
    order: 100,
    component: () => import("../plugin/layer-editor/ToolEditor"),
    label: gettext("Editor"),
    position: "top-left",
    embeddedShowMode: "always",
    props: { groupId: EDITING_ID },
});
