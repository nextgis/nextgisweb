/// <reference types="dojo/dijit" />

import orderBy from "lodash-es/orderBy";

import Attribution from "ol/control/Attribution";
import Rotate from "ol/control/Rotate";
import ScaleLine from "ol/control/ScaleLine";
import Zoom from "ol/control/Zoom";

import { gettext } from "@nextgisweb/pyramid/i18n";
import { html } from "@nextgisweb/pyramid/icon";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Import URL parser module
import InfoScale from "ngw-webmap/controls/InfoScale";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Import URL parser module
import InitialExtent from "ngw-webmap/controls/InitialExtent";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Import URL parser module
import MyLocation from "ngw-webmap/controls/MyLocation";

import type { DojoDisplay } from "../type";

import { ToolsInfo, buildTools } from "./map-tools";
import type { ControlInfo } from "./type";
import { getControlsInfo } from "./utils";

const getLabel = (glyph: string): HTMLElement => {
    const labelEl = document.createElement("span");
    labelEl.innerHTML = html({ glyph });
    labelEl.classList.add("ol-control__icon");
    return labelEl;
};

export const ControlsInfo: ControlInfo[] = [
    {
        constructor: (display) => {
            return new Zoom({
                zoomInLabel: getLabel("add"),
                zoomOutLabel: getLabel("remove"),
                zoomInTipLabel: gettext("Zoom in"),
                zoomOutTipLabel: gettext("Zoom out"),
                target: display.leftTopControlPane,
            });
        },
        embeddedShowMode: "always",
    },
    {
        constructor: (display) => {
            return new Attribution({
                tipLabel: gettext("Attributions"),
                target: display.rightBottomControlPane,
                collapsible: false,
            });
        },
        embeddedShowMode: "always",
    },
    {
        constructor: (display) => {
            return new Rotate({
                tipLabel: gettext("Reset rotation"),
                target: display.leftTopControlPane,
                label: getLabel("arrow_upward"),
            });
        },
    },
    {
        urlKey: "sl",
        constructor: (display) => {
            return new ScaleLine({
                target: display.rightBottomControlPane,
                minWidth: 48,
            });
        },
        label: gettext("Scale line"),
        embeddedShowMode: "customize",
    },
    {
        urlKey: "is",
        constructor: (display) => {
            return new InfoScale({
                display: display,
                target: display.rightBottomControlPane,
            });
        },
        label: gettext("Info scale"),
        embeddedShowMode: "customize",
    },
    {
        urlKey: "ie",
        constructor: (display) => {
            return new InitialExtent({
                display: display,
                target: display.leftTopControlPane,
                tipLabel: gettext("Initial extent"),
            });
        },
        label: gettext("Initial extent"),
        embeddedShowMode: "customize",
    },
    {
        urlKey: "ml",
        constructor: (display) => {
            return new MyLocation({
                display: display,
                target: display.leftTopControlPane,
                tipLabel: gettext("Locate me"),
            });
        },
        label: gettext("Locate me"),
        embeddedShowMode: "customize",
    },
];

// export const getControlsInfo = (display: DojoDisplay): ControlInfo[] => {
//     let controls;

//     if (display.isTinyMode()) {
//         const urlParams = display.getUrlParams();
//         if ("controls" in urlParams && urlParams.controls) {
//             const urlKeys = urlParams.controls.split(",");
//             controls = ControlsInfo.filter((c: ControlInfo) => {
//                 const matchToUrlKey = c.urlKey
//                     ? urlKeys.includes(c.urlKey)
//                     : false;
//                 const alwaysEmbeddedShow = c.embeddedShowMode === "always";
//                 return matchToUrlKey || alwaysEmbeddedShow;
//             });
//         } else {
//             controls = ControlsInfo.filter(
//                 (c) => c.embeddedShowMode === "always"
//             );
//         }
//     } else {
//         controls = [...ControlsInfo];
//     }

//     return controls;
// };

export const buildControls = (display: DojoDisplay) => {
    const controls = getControlsInfo(display, ControlsInfo).map((c) => {
        return c.constructor(display);
    });
    display._mapAddControls(controls);

    const mapToolbar = buildTools(display);
    display._mapAddControls([mapToolbar]);
};

export const getControls = () => {
    const controls = [...ControlsInfo, ...ToolsInfo];
    return orderBy(controls, ["label"]);
};
