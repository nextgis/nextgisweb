/// <reference types="dojo/dijit" />

import { gettext } from "@nextgisweb/pyramid/i18n";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Import URL parser module
import ToolMeasure from "ngw-webmap/tool/Measure";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Import URL parser module
import ToolSwipe from "ngw-webmap/tool/Swipe";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Import URL parser module
import ToolViewerInfo from "ngw-webmap/tool/ViewerInfo";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore Import URL parser module
import ToolZoom from "ngw-webmap/tool/Zoom";

import type { DojoDisplay, MapToolbar } from "../type/DojoDisplay";

import type { ToolInfo } from "./type";
import { getControlsInfo } from "./utils";

export const ToolsInfo: ToolInfo[] = [
    {
        label: gettext("Zoom in"),
        constructor: (display) => {
            return new ToolZoom({ display, out: false });
        },
        urlKey: "zi",
        mapStateKey: "zoomingIn",
        embeddedShowMode: "customize",
    },
    {
        label: gettext("Zoom Out"),
        constructor: (display) => {
            return new ToolZoom({ display, out: true });
        },
        urlKey: "zo",
        mapStateKey: "zoomingOut",
        embeddedShowMode: "customize",
    },
    {
        label: gettext("Measure distance"),
        constructor: (display) => {
            return new ToolMeasure({ display, type: "LineString" });
        },
        urlKey: "md",
        mapStateKey: "measuringLength",
        embeddedShowMode: "customize",
    },
    {
        label: gettext("Measure area"),
        constructor: (display) => {
            return new ToolMeasure({ display, type: "Polygon" });
        },
        urlKey: "ma",
        mapStateKey: "measuringArea",
        embeddedShowMode: "customize",
    },
    {
        label: gettext("Vertical swipe"),
        constructor: (display) => {
            return new ToolSwipe({ display, orientation: "vertical" });
        },
        urlKey: "sv",
        mapStateKey: "swipeVertical",
    },
    {
        label: gettext("Cursor coordinates / extent"),
        constructor: (display) => {
            return new ToolViewerInfo({ display });
        },
        urlKey: "tv",
        mapStateKey: "~viewerInfo",
        embeddedShowMode: "customize",
    },
];

export const getToolsInfo = (urlKeys?: string[]): ToolInfo[] => {
    if (!urlKeys) {
        return [...ToolsInfo];
    }
    return ToolsInfo.filter((t) => urlKeys.includes(t.urlKey));
};

export const buildTools = (display: DojoDisplay): MapToolbar => {
    const tools = getControlsInfo(display, ToolsInfo);
    const mapToolbar = display.mapToolbar;
    tools.forEach((t: ToolInfo) => {
        mapToolbar.items.addTool(t.constructor(display), t.mapStateKey);
    });
    return mapToolbar;
};
