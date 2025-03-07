import { Overlay } from "ol";
import type { Options as OverlayOptions } from "ol/Overlay";
import type { Coordinate } from "ol/coordinate";

import "./ol-popup.css";

export interface PopupOptions extends OverlayOptions {
    customCssClass?: string;
}

export class OlPopup extends Overlay {
    public container: HTMLElement;
    public content: HTMLElement;
    public closer: HTMLAnchorElement;

    constructor(options: PopupOptions = {}) {
        const defaultOptions: PopupOptions = {
            autoPan: {
                animation: { duration: 250 },
            },
        };

        const mergedOptions = { ...defaultOptions, ...options };

        const element = document.createElement("div");
        mergedOptions.element = element;

        super(mergedOptions);

        this.container = element;
        this.container.className = "ol-popup";

        if (options.customCssClass) {
            this.container.className += ` ${options.customCssClass}`;
        }

        this.closer = document.createElement("a");
        this.closer.className = "ol-popup-closer";
        this.closer.href = "#";
        this.container.appendChild(this.closer);

        this.closer.addEventListener(
            "click",
            (evt: Event) => {
                this.container.style.display = "none";
                this.closer.blur();
                evt.preventDefault();
            },
            false
        );

        this.content = document.createElement("div");
        this.content.className = "ol-popup-content";
        this.container.appendChild(this.content);

        // Apply workaround to enable scrolling of content div on touch devices
        OlPopup.enableTouchScroll_(this.content);
    }

    /**
     * Show the popup.
     * @param {ol.Coordinate} coord Where to anchor the popup.
     * @param {String|HTMLElement} html String or element of HTML to display within the popup.
     * @returns {Popup} The Popup instance
     */
    public show(coord: Coordinate, html: string | HTMLElement): this {
        if (html instanceof HTMLElement) {
            this.content.innerHTML = "";
            this.content.appendChild(html);
        } else {
            this.content.innerHTML = html;
        }

        this.container.style.display = "block";
        this.content.scrollTop = 0;
        this.setPosition(coord);

        return this;
    }

    /**
     * Hide the popup.
     * @returns {Popup} The Popup instance
     */
    public hide(): this {
        this.container.style.display = "none";
        return this;
    }

    /**
     * Indicates if the popup is in open state
     * @returns {Boolean} Whether the popup instance is open
     */
    public isOpened(): boolean {
        return this.container.style.display === "block";
    }

    private static isTouchDevice_(): boolean {
        try {
            document.createEvent("TouchEvent");
            return true;
        } catch (e) {
            return false;
        }
    }

    private static enableTouchScroll_(element: HTMLElement): void {
        if (!OlPopup.isTouchDevice_()) return;

        let scrollStartPos = 0;

        element.addEventListener(
            "touchstart",
            function (this: HTMLElement, event: TouchEvent) {
                scrollStartPos = this.scrollTop + event.touches[0].pageY;
            },
            false
        );

        element.addEventListener(
            "touchmove",
            function (this: HTMLElement, event: TouchEvent) {
                this.scrollTop = scrollStartPos - event.touches[0].pageY;
            },
            false
        );
    }
}
