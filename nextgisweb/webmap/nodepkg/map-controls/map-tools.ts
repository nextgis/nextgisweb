import { gettext } from "@nextgisweb/pyramid/i18n";

import type { Display } from "../display";
import type MapToolbar from "../map-toolbar";

import { ToolMeasure } from "./tool/Measure";
import { ToolSwipe } from "./tool/Swipe";
import { ToolViewerInfo } from "./tool/ViewerInfo";
import { ToolZoom } from "./tool/Zoom";
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

export const getToolsInfo = (display: Display): ToolInfo[] => {
    return getControlsInfo<ToolInfo>(display, ToolsInfo);
};

export const buildTools = (
    display: Display,
    tools: ToolInfo[],
    controlsReady: Map<string, ControlReady>
): MapToolbar | undefined => {
    const mapToolbar = display.mapToolbar;
    if (mapToolbar) {
        tools.forEach((t: ToolInfo) => {
            const tool = t.ctor(display);
            if (t.mapStateKey) {
                mapToolbar.items.addTool(tool, t.mapStateKey);
            }
            controlsReady.set(t.key, { control: tool, info: t });
        });
    }
    return mapToolbar;
};
