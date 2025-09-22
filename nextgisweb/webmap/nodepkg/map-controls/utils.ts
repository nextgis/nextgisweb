import type { FC } from "react";

import { iconHtml } from "@nextgisweb/pyramid/icon";

export const getLabel = (Icon: FC & { id: string }): HTMLElement => {
    const labelEl = document.createElement("span");
    labelEl.innerHTML = iconHtml(Icon);
    labelEl.classList.add("ol-control__icon");
    return labelEl;
};
