import { Overlay } from "ol";
import type { Options as OverlayOptions } from "ol/Overlay";

import "./Popup.css";

interface PopupOptions extends Partial<OverlayOptions> {
    title?: string;
    size: [width: number, height: number];
}

export class Popup extends Overlay {
    container: HTMLDivElement;
    contentDiv: HTMLDivElement;
    private titleSpan: HTMLSpanElement;

    constructor({ size, title, ...options }: PopupOptions) {
        const container = document.createElement("div");
        container.className = "ngwPopup"; // Before dijitTooltipBelow

        const subcontainer = document.createElement("div");
        subcontainer.className = "tooltip__container"; // Before dijitTooltipContainer
        container.appendChild(subcontainer);

        const contentDiv = document.createElement("div");
        contentDiv.className = "popup__content";
        contentDiv.style.width = `${size[0]}px`;
        contentDiv.style.height = `${size[1]}px`;
        subcontainer.appendChild(contentDiv);

        const titleBar = document.createElement("div");
        titleBar.className = "popup__title";
        subcontainer.insertBefore(titleBar, contentDiv);

        const titleSpan = document.createElement("span");
        titleSpan.innerHTML = title || "&nbsp;";
        titleBar.appendChild(titleSpan);

        // Close button in the header
        const closeButton = document.createElement("span");
        closeButton.className = "popup__close"; // Before dijitDialogCloseIcon
        closeButton.addEventListener("click", () => this.setMap(null));
        titleBar.appendChild(closeButton);

        // Connector arrow
        const connector = document.createElement("div");
        connector.className = "popup__connector"; // Before dijitTooltipConnector
        container.appendChild(connector);

        super({
            element: container,
            autoPan: true,
            offset: [-13, -8],
            autoPanAnimation: {
                duration: 250,
            },
            ...options,
        });

        this.container = container;
        this.contentDiv = contentDiv;
        this.titleSpan = titleSpan;
    }

    setTitle(title: string): void {
        this.titleSpan.innerHTML = title;
    }
}
