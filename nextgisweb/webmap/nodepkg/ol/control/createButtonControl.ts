import "./createButtonControl.css";
import Control from "ol/control/Control";

export type OnClickSync = () => void;
export type OnClickAsync = () => Promise<void>;

export type OnClick = OnClickSync | OnClickAsync;

/**
 * Options for creating a {@link WebMapControls.createButtonControl | button control}.
 */
export interface ButtonControlOptions {
    /** Button content. */
    html?: string | HTMLElement;
    /** Additional css class string */
    addClass?: string;
    /** Set an action to execute when button clicked. */
    onClick?: OnClick;
    /** Button HTMLElement title */
    title?: string;
}

function createControlElement(options: ButtonControlOptions): HTMLElement {
    const button = document.createElement("button");
    button.className = "custom-button-control";
    if (typeof options.html === "string") {
        button.innerHTML = options.html;
    } else if (options.html instanceof HTMLElement) {
        button.appendChild(options.html);
    }
    if (typeof options.title === "string") {
        button.title = options.title;
    }

    const element = document.createElement("div");
    element.className = `ol-unselectable mapadapter-ctrl-group${options.addClass ? ` ${options.addClass}` : ""}`;
    element.appendChild(button);

    return element;
}

export function createButtonControl(options: ButtonControlOptions): Control {
    class ButtonControl extends Control {
        constructor() {
            super({ element: createControlElement(options) });
            const button = this.element.querySelector("button");
            if (button && options.onClick) {
                button.addEventListener("click", async (event) => {
                    event.preventDefault();
                    if (options.onClick) {
                        try {
                            await options.onClick();
                        } catch (error) {
                            console.error(
                                "Error in button click handler:",
                                error
                            );
                        }
                    }
                });
            }
        }
    }

    return new ButtonControl();
}
