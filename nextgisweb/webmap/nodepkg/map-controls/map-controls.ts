/** @plugin */

import { gettext } from "@nextgisweb/pyramid/i18n";
import {
    mapControlRegistry,
    olControlRegistry,
} from "@nextgisweb/webmap/display/component/map-panel/registry";

mapControlRegistry(COMP_ID, {
    key: "at",
    order: 1000,
    component: () => import("../map-component/control/MapToolbarControl"),
    label: gettext("Attibution Toolbar"),
    position: "bottom-right",
    props: {
        id: "attribution-toolbar",
        direction: "horizontal",
        align: "center",
        gap: 10,
    },
});

mapControlRegistry(COMP_ID, {
    key: "mt",
    component: () => import("../map-component/control/MapToolbarControl"),
    label: gettext("Map Toolbar"),
    position: "bottom-left",
    props: { id: "map-toolbar", direction: "horizontal" },
});

mapControlRegistry(COMP_ID, {
    key: "z",
    order: 10,
    component: () => import("../map-component/control/ZoomControl"),
    embeddedShowMode: "always",
    position: "top-left",
});

mapControlRegistry(COMP_ID, {
    key: "rot",
    order: 30,
    component: () => import("../map-component/control/RotateControl"),
    position: "top-left",
});

mapControlRegistry(COMP_ID, {
    key: "attr",
    order: 10,
    component: () => import("../map-component/control/AttributionControl"),
    embeddedShowMode: "always",
    position: { inside: "attribution-toolbar" },
});

mapControlRegistry(COMP_ID, {
    key: "is",
    order: 30,
    component: () => import("../map-component/control/InfoScaleControl"),
    label: gettext("Info scale"),
    embeddedShowMode: "customize",
    position: { inside: "attribution-toolbar" },
});
olControlRegistry(COMP_ID, {
    key: "sl",
    order: 20,
    ctor: () =>
        import("ol/control/ScaleLine").then(
            (mod) =>
                new mod.default({
                    minWidth: 48,
                })
        ),
    embeddedShowMode: "customize",
    position: { inside: "attribution-toolbar" },
});

mapControlRegistry(COMP_ID, {
    key: "ie",
    order: 60,
    component: () => import("../map-component/control/InitialExtentControl"),
    label: gettext("Initial extent"),
    embeddedShowMode: "customize",
    position: "top-left",
});
mapControlRegistry(COMP_ID, {
    key: "ml",
    order: 70,
    component: () => import("../map-component/control/MyLocationControl"),
    label: gettext("Locate me"),
    embeddedShowMode: "customize",
    position: "top-left",
});

mapControlRegistry(COMP_ID, {
    key: "id",
    component: () => import("../map-component/control/IdentifyControl"),
    label: gettext("Identification"),
    embeddedShowMode: "customize",
    props: { isDefaultGroupId: true, groupId: "identifying" },
});

// export const buildControls = (display: Display): Map<string, ControlReady> => {
//     const controlsMap = new Map<string, ControlReady>();

//     const controlsInfo = getControlsInfo<ControlInfo>(display, ControlsInfo);
//     const controlsToMap: Control[] = [];
//     controlsInfo.forEach((c: ControlInfo) => {
//         const control = c.ctor(display);
//         if (c.postCreate) {
//             c.postCreate(display, control);
//         }
//         controlsMap.set(c.key, { info: c, control });

//         if (control instanceof Control) {
//             controlsToMap.push(control);
//         }
//     });
//     display._mapAddControls(controlsToMap);

//     const toolsInfo = getToolsInfo(display);
//     const mapToolbar = buildTools(display, toolsInfo, controlsMap);
//     if (mapToolbar) {
//         display._mapAddControls([mapToolbar]);
//     }

//     return controlsMap;
// };

// export const getControls = () => {
//     const controls = [...ControlsInfo, ...ToolsInfo];
//     return orderBy(controls, ["label"]);
// };
