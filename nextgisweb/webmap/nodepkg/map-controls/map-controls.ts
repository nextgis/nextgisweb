/** @plugin */

import { gettext } from "@nextgisweb/pyramid/i18n";
import { mapControlRegistry } from "@nextgisweb/webmap/display/component/map-panel/registry";

mapControlRegistry(COMP_ID, {
    key: "at",
    order: 1000,
    label: gettext("Attibution Toolbar"),
    props: {
        id: "attribution-toolbar",
        direction: "horizontal",
        align: "center",
        gap: 8,
    },
    position: "bottom-right",
    showOnPreview: true,
    embeddedShowMode: "always",
    component: () => import("../map-component/control/MapToolbarControl"),
});

mapControlRegistry(COMP_ID, {
    key: "mt",
    label: gettext("Map Toolbar"),
    props: { id: "map-toolbar", direction: "horizontal" },
    position: "bottom-left",
    showOnPreview: true,
    embeddedShowMode: "always",
    component: () => import("../map-component/control/MapToolbarControl"),
});

mapControlRegistry(COMP_ID, {
    key: "z",
    order: 10,
    position: "top-left",
    embeddedShowMode: "always",
    component: () => import("../map-component/control/ZoomControl"),
});

mapControlRegistry(COMP_ID, {
    key: "rot",
    order: 30,
    position: "top-left",
    showOnPreview: true,
    component: () => import("../map-component/control/RotateControl"),
});

mapControlRegistry(COMP_ID, {
    key: "attr",
    order: 30,
    position: { inside: "attribution-toolbar" },
    showOnPreview: true,
    embeddedShowMode: "always",
    component: () => import("../map-component/control/AttributionControl"),
});

mapControlRegistry(COMP_ID, {
    key: "is",
    order: 10,
    label: gettext("Info scale"),
    position: { inside: "attribution-toolbar" },
    hideOnMobile: true,
    embeddedShowMode: "customize",
    component: () => import("../map-component/control/InfoScaleControl"),
});

mapControlRegistry(COMP_ID, {
    key: "sl",
    order: 20,
    label: gettext("Scale line"),
    props: { scaleOptions: { minWidth: 48 } },
    position: { inside: "attribution-toolbar" },
    showOnPreview: true,
    embeddedShowMode: "customize",
    component: () => import("../map-component/control/ScaleLineControl"),
});

mapControlRegistry(COMP_ID, {
    key: "li",
    order: 30,
    label: gettext("Loading indicator"),
    props: {},
    position: { inside: "attribution-toolbar" },
    showOnPreview: true,
    embeddedShowMode: "customize",
    component: () =>
        import("../map-component/control/MapLoadingIndicatorControl"),
});

mapControlRegistry(COMP_ID, {
    key: "ie",
    order: 60,
    label: gettext("Initial extent"),
    position: "top-left",
    embeddedShowMode: "customize",
    component: () => import("../map-component/control/InitialExtentControl"),
});

mapControlRegistry(COMP_ID, {
    key: "ml",
    order: 70,
    label: gettext("Locate me"),
    position: "top-left",
    showOnPreview: true,
    embeddedShowMode: "customize",
    component: () => import("../map-component/control/MyLocationControl"),
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
    component: () => import("../map-component/control/IdentifyControl"),
});
