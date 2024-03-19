import type { DojoDisplay } from "../type";

import type { ControlInfo, ToolInfo } from "./type";

type ControlsInfo = ControlInfo | ToolInfo;

export const getControlsInfo = (
    display: DojoDisplay,
    controlsInfo: ControlsInfo[]
): ControlsInfo[] => {
    let controls;

    if (display.isTinyMode()) {
        const urlParams = display.getUrlParams();
        if ("controls" in urlParams && urlParams.controls) {
            const urlKeys = urlParams.controls.split(",");
            controls = controlsInfo.filter((c: ControlsInfo) => {
                const matchToUrlKey = c.urlKey
                    ? urlKeys.includes(c.urlKey)
                    : false;
                const alwaysEmbeddedShow = c.embeddedShowMode === "always";
                return matchToUrlKey || alwaysEmbeddedShow;
            });
        } else {
            controls = controlsInfo.filter(
                (c) => c.embeddedShowMode === "always"
            );
        }
    } else {
        controls = [...controlsInfo];
    }

    return controls;
};
