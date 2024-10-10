import type Control from "ol/control/Control";

import { createButtonControl } from "./createButtonControl";

export type HtmlDef = string | HTMLElement;
export type HtmlToggle = { on: HtmlDef; off: HtmlDef };
export type TitleToggle = { on: string; off: string };
export type OnToggleClick = (status: boolean) => void | Promise<void>;
export type StyleToggle = Partial<CSSStyleDeclaration>;

export interface ToggleControlOptions {
    status?: boolean;
    html?: HtmlDef | HtmlToggle;
    addClass?: string;
    addClassOn?: string;
    addClassOff?: string;
    title?: string | TitleToggle;
    onClick?: OnToggleClick;
    getStatus?: () => boolean;
    styleOn?: StyleToggle;
    styleOff?: StyleToggle;
}

export interface ToggleControl extends Control {
    onClick: (status?: boolean) => void;
    changeStatus: (status?: boolean) => void;
}

export function createToggleControl(
    options: ToggleControlOptions
): ToggleControl {
    let status = options.getStatus?.() ?? options.status ?? false;

    const link = document.createElement("div");

    function setTitle() {
        if (options.title) {
            link.title =
                typeof options.title === "string"
                    ? options.title
                    : status
                      ? options.title.on
                      : options.title.off;
            link.setAttribute("aria-label", link.title);
        }
    }

    function setHtml() {
        if (options.html) {
            const content =
                typeof options.html === "string" ||
                options.html instanceof HTMLElement
                    ? options.html
                    : status
                      ? options.html.on
                      : options.html.off;

            link.innerHTML = "";
            if (content instanceof HTMLElement) {
                link.appendChild(content);
            } else {
                link.innerHTML = content;
            }
        }
    }

    function setClass() {
        if (options.addClassOn) {
            link.classList.toggle(options.addClassOn, status);
        }
        if (options.addClassOff) {
            link.classList.toggle(options.addClassOff, !status);
        }
    }

    function setStyle() {
        const styleToApply = status ? options.styleOn : options.styleOff;
        if (styleToApply) {
            Object.assign(link.style, styleToApply);
        }
    }

    function updateControl() {
        setHtml();
        setTitle();
        setClass();
        setStyle();
    }

    if (options.addClass) {
        link.classList.add(...options.addClass.split(" "));
    }

    updateControl();

    const changeStatus = (newStatus?: boolean) => {
        if (newStatus !== undefined) {
            status = newStatus;
        }
        updateControl();
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
        addClass: options.addClass,
        title: typeof options.title === "string" ? options.title : undefined,
    }) as ToggleControl;

    buttonControl.onClick = onClick;
    buttonControl.changeStatus = changeStatus;

    return buttonControl;
}
