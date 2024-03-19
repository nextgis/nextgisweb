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

import type { ControlReady, ToolInfo } from "./type";
import { getControlsInfo } from "./utils";

export const ToolsInfo: ToolInfo[] = [
    {
        label: gettext("Zoom in"),
        ctor: (display) => {
            return new ToolZoom({ display, out: false });
        },
        key: "zi",
        mapStateKey: "zoomingIn",
        embeddedShowMode: "customize",
    },
    {
        label: gettext("Zoom out"),
        ctor: (display) => {
            return new ToolZoom({ display, out: true });
        },
        key: "zo",
        mapStateKey: "zoomingOut",
        embeddedShowMode: "customize",
    },
    {
        label: gettext("Measure distance"),
        ctor: (display) => {
            return new ToolMeasure({ display, type: "LineString" });
        },
        key: "md",
        mapStateKey: "measuringLength",
        embeddedShowMode: "customize",
    },
    {
        label: gettext("Measure area"),
        ctor: (display) => {
            return new ToolMeasure({ display, type: "Polygon" });
        },
        key: "ma",
        mapStateKey: "measuringArea",
        embeddedShowMode: "customize",
    },
    {
        label: gettext("Vertical swipe"),
        ctor: (display) => {
            return new ToolSwipe({ display, orientation: "vertical" });
        },
        key: "sv",
        mapStateKey: "swipeVertical",
    },
    {
        label: gettext("Cursor coordinates / extent"),
        ctor: (display) => {
            return new ToolViewerInfo({ display });
        },
        key: "tv",
        mapStateKey: "~viewerInfo",
        embeddedShowMode: "customize",
    },
];

export const getToolsInfo = (display: DojoDisplay): ToolInfo[] => {
    return getControlsInfo<ToolInfo>(display, ToolsInfo);
};

export const buildTools = (
    display: DojoDisplay,
    tools: ToolInfo[],
    controlsReady: Map<string, ControlReady>
): MapToolbar => {
    const mapToolbar = display.mapToolbar;
    tools.forEach((t: ToolInfo) => {
        const tool = t.ctor(display);
        if (t.mapStateKey) {
            mapToolbar.items.addTool(tool, t.mapStateKey);
        }
        controlsReady.set(t.key, { control: tool, info: t });
    });
    return mapToolbar;
};
