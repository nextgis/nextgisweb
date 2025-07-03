import reactApp from "@nextgisweb/gui/react-app";
import type { ReactAppReturn } from "@nextgisweb/gui/react-app";
import { gettext } from "@nextgisweb/pyramid/i18n";
import { iconHtml } from "@nextgisweb/pyramid/icon";
import type { Display } from "@nextgisweb/webmap/display";
import type { ToggleControl } from "@nextgisweb/webmap/map-toolbar/ToggleControl";
import MapViewerInfoComp from "@nextgisweb/webmap/map-viewer-info";
import type { MapViewerInfoProps } from "@nextgisweb/webmap/map-viewer-info/MapViewerInfo";

import { ToolBase } from "./ToolBase";

import Icon from "@nextgisweb/icon/material/location_searching";

interface ViewerInfoOptions {
    display: Display;
}

export class ToolViewerInfo extends ToolBase {
    customCssClass: string = "viewer-info-tool";
    label: string;
    customIcon: string;
    toolbarBtn?: ToggleControl;
    private mapViewerInfoCompDomNode?: HTMLElement;
    private app?: ReactAppReturn<MapViewerInfoProps>;

    constructor({ display }: ViewerInfoOptions) {
        super({ display });
        this.label = gettext("Show cursor coordinates / extent");
        this.customIcon = `
            <span class="ol-control__icon">
                ${iconHtml(Icon)}
            </span>
        `;
    }

    activate(): void {
        if (!this.mapViewerInfoCompDomNode) {
            const domNode = this.toolbarBtn?.domNode;
            if (domNode) {
                const newNode = document.createElement("div");
                newNode.classList.add("viewer-info");
                domNode.insertAdjacentElement("afterend", newNode);

                this.mapViewerInfoCompDomNode = newNode;
            }
        }
        this.makeComp(true);
    }

    deactivate(): void {
        this.makeComp(false);
    }

    destroy(): void {
        if (this.app) {
            this.app.unmount();
        }
    }

    private makeComp(show: boolean): void {
        if (this.mapViewerInfoCompDomNode) {
            if (this.app) {
                this.app.update({ show });
            } else {
                this.app = reactApp(
                    MapViewerInfoComp,
                    {
                        show,
                        map: this.display.map.olMap,
                    },
                    this.mapViewerInfoCompDomNode
                );
            }
        }
    }
}
