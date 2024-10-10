import type Control from "ol/control/Control";

import { createButtonControl } from "./createButtonControl";

export type OnToggleClick = (status: boolean) => void | Promise<void>;

type ToggleActiveProp<T> = T | ((status: boolean) => T);
type Style = ToggleActiveProp<Partial<CSSStyleDeclaration> | undefined>;
export interface ToggleControlOptions {
    status?: boolean;
    getStatus?: () => boolean;
    onClick?: OnToggleClick;
    html?: ToggleActiveProp<string | HTMLElement>;
    title?: ToggleActiveProp<string>;
    className?: ToggleActiveProp<string>;
    style?: Style;
}

export interface ToggleControl extends Control {
    onClick: (status?: boolean) => void;
    changeStatus: (status?: boolean) => void;
    setStyle: (style: Style) => void;
}

export function createToggleControl(
    options: ToggleControlOptions
): ToggleControl {
    let status = options.getStatus?.() ?? options.status ?? false;

    const link = document.createElement("div");

    const getVal = <T>(o: T) => {
        if (typeof o === "function") {
            return o(status);
        }
        return o;
    };

    function updateControl() {
        if (options.html) {
            const htmlContent = getVal(options.html);
            link.innerHTML = "";
            if (htmlContent instanceof HTMLElement) {
                link.appendChild(htmlContent);
            } else {
                link.innerHTML = htmlContent;
            }
        }

        if (options.title) {
            const titleText = getVal(options.title);
            link.title = titleText;
            link.setAttribute("aria-label", titleText);
        }

        if (options.className) {
            link.className = getVal(options.className);
        }

        if (options.style) {
            Object.assign(link.style, getVal(options.style));
        }
    }

    updateControl();

    const changeStatus = (newStatus?: boolean) => {
        if (newStatus !== undefined) {
            status = newStatus;
        }
        updateControl();
    };

    const setStyle = (style: Style) => {
        options.style = style;
        Object.assign(link.style, getVal(options.style));
    };

    const onClick = async (newStatus?: boolean) => {
        status = newStatus !== undefined ? newStatus : !status;
        if (options.onClick) {
            try {
                await options.onClick(status);
                updateControl();
            } catch (error) {
                console.error("Error in toggle click handler:", error);
                status = !status; // Revert status on error
            }
        } else {
            updateControl();
        }
    };

    const buttonControl = createButtonControl({
        html: link,
        onClick,
    }) as ToggleControl;

    buttonControl.onClick = onClick;
    buttonControl.changeStatus = changeStatus;
    buttonControl.setStyle = setStyle;

    return buttonControl;
}
