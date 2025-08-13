/** @plugin */

// import { orderBy } from "lodash-es";
// import { Control } from "ol/control";

// import type { Display } from "../display";
// import { InfoScale } from "./control/InfoScale";
// import { InitialExtent } from "./control/InitialExtent";
// import { MyLocation } from "./control/MyLocation";

import { gettext } from "@nextgisweb/pyramid/i18n";
import {
    mapControlRegistry,
    olControlRegistry,
} from "@nextgisweb/webmap/display/component/map-panel/registry";

// import { ToolsInfo, buildTools, getToolsInfo } from "./map-tools";
// import { Identify } from "./tool/Identify";
import type {
    ControlInfo,
    // ControlReady
} from "./type";

// import { getControlsInfo } from "./utils";

mapControlRegistry(COMP_ID, {
    key: "z",
    order: 10,
    component: () => import("../map-component/control/ZoomControl"),
    embeddedShowMode: "always",
    props: { position: "top-left" },
});

mapControlRegistry(COMP_ID, {
    key: "attr",
    order: 20,
    component: () => import("../map-component/control/AttributionControl"),
    embeddedShowMode: "always",
    props: { position: "bottom-right", collapsible: false },
});

mapControlRegistry(COMP_ID, {
    key: "rot",
    order: 30,
    component: () => import("../map-component/control/RotateControl"),
    props: { position: "top-left" },
});

olControlRegistry(COMP_ID, {
    key: "sl",
    order: 40,
    ctor: () =>
        import("ol/control/ScaleLine").then(
            (mod) =>
                new mod.default({
                    minWidth: 48,
                })
        ),
    embeddedShowMode: "customize",
    position: "bottom-right",
});

mapControlRegistry(COMP_ID, {
    key: "is",
    order: 50,
    component: () => import("../map-component/control/InfoScaleControl"),
    label: gettext("Info scale"),
    embeddedShowMode: "customize",
    props: { position: "bottom-right" },
});
mapControlRegistry(COMP_ID, {
    key: "ie",
    order: 60,
    component: () => import("../map-component/control/InitialExtentControl"),
    label: gettext("Initial extent"),
    embeddedShowMode: "customize",
    props: { position: "top-left" },
});

// olControlRegistry(COMP_ID, {
//     key: "ml",
//     order: 70,
//     ctor: (map) =>
//         import("./control/MyLocation").then(
//             ({ MyLocation }) =>
//                 new MyLocation({
//                     map,
//                     tipLabel: gettext("Locate me"),
//                 })
//         ),
//     label: gettext("Locate me"),
//     embeddedShowMode: "customize",
//     position: "top-left",
// });

export const ControlsInfo: ControlInfo[] = [
    // {
    //     label: gettext("Identification"),
    //     ctor: (display) => {
    //         return new Identify({ display });
    //     },
    //     key: "id",
    //     mapStateKey: "identifying",
    //     embeddedShowMode: "customize",
    //     olMapControl: false,
    // },
];

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
