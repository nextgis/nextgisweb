import reactApp from "@nextgisweb/gui/react-app";
import type { ReactAppReturn } from "@nextgisweb/gui/react-app";
import i18n from "@nextgisweb/pyramid/i18n";
import { html as iconHtml } from "@nextgisweb/pyramid/icon";
import type { ToggleControl } from "@nextgisweb/webmap/map-toolbar/ToggleControl";
import MapViewerInfoComp from "@nextgisweb/webmap/map-viewer-info";
import type { MapViewerInfoProps } from "@nextgisweb/webmap/map-viewer-info/MapViewerInfo";
import type { DojoDisplay } from "@nextgisweb/webmap/type";

import { Base } from "./Base";

interface ViewerInfoOptions {
    display: DojoDisplay;
}

export class ViewerInfoTool extends Base {
    customCssClass: string = "viewer-info-tool";
    label: string;
    customIcon: string;
    private toolbarBtn?: ToggleControl;
    private mapViewerInfoCompDomNode?: HTMLElement;
    private app?: ReactAppReturn<MapViewerInfoProps>;

    constructor({ display }: ViewerInfoOptions) {
        super({ display });
        this.label = i18n.gettext("Show cursor coordinates / extent");
        this.customIcon = `
            <span class="ol-control__icon">
                ${iconHtml({ glyph: "location_searching" })}
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