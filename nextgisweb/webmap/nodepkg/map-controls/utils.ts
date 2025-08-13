import type { FC } from "react";

import { iconHtml } from "@nextgisweb/pyramid/icon";

import type { Display } from "../display";

import type { ControlsInfo } from "./type";

export const getLabel = (Icon: FC & { id: string }): HTMLElement => {
    const labelEl = document.createElement("span");
    labelEl.innerHTML = iconHtml(Icon);
    labelEl.classList.add("ol-control__icon");
    return labelEl;
};

export const getControlsInfo = <T extends ControlsInfo>(
    display: Display,
    controlsInfo: T[]
): T[] => {
    let controls;

    if (display.isTinyMode()) {
        const urlParams = display.getUrlParams();
        const urlKeys = urlParams.controls;
        if (urlKeys) {
            controls = controlsInfo.filter((c: ControlsInfo) => {
                const matchToUrlKey = c.key ? urlKeys.includes(c.key) : false;
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
