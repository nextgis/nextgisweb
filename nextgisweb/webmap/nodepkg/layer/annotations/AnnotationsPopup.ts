import topic from "@nextgisweb/webmap/compat/topic";

import type { MapStore } from "../../ol/MapStore";
import { OlPopup } from "../../ol-ext/ol-popup";
import type { PopupOptions } from "../../ol-ext/ol-popup";

import type { AnnotationFeature, AnnotationInfo } from "./AnnotationFeature";
import { createPopupContent } from "./util/createPopupContent";
import { getPopupCoordinates } from "./util/getPopupCoordinates";
import "./AnnotationsPopup.css";

interface PopupTemplateElements {
    descriptionDiv: HTMLElement;
    spanEditAnnotation: HTMLElement;
}

type AccessType = "public" | "own" | "private" | null;

class OlPopupExtended extends OlPopup {
    constructor(
        public annFeature: AnnotationFeature,
        public annPopup: AnnotationsPopup,
        options: PopupOptions = {}
    ) {
        super(options);
    }

    cloneOlPopup(annFeature: AnnotationFeature): OlPopup {
        const popup = new OlPopup({
            insertFirst: false,
            autoPan: false,
            customCssClass: "annotation no-edit",
        });

        const coordinates = getPopupCoordinates(annFeature);
        popup.show(coordinates, "");

        const { content, description } = createPopupContent();
        popup.content.appendChild(content);

        if (description) {
            description.innerHTML = annFeature.getDescriptionAsHtml();
        }

        return popup;
    }
}

export class AnnotationsPopup {
    private _popup: OlPopupExtended;
    private _annFeature: AnnotationFeature;
    private _contentElements: PopupTemplateElements | null = null;
    private _editable: boolean;
    private _map: MapStore | null = null;

    constructor(
        annotationFeature: AnnotationFeature,
        editable: boolean = false,
        annotationInfo?: AnnotationInfo
    ) {
        this._editable = editable;
        this._annFeature = annotationFeature;

        const customCssClass = annotationInfo
            ? `annotation ${this._getAccessCssClass(annotationFeature)}`
            : "annotation";

        this._popup = new OlPopupExtended(annotationFeature, this, {
            insertFirst: false,
            autoPan: false,
            customCssClass,
        });

        if (annotationInfo) {
            this._setTitle(annotationFeature);
        }
    }

    update(): void {
        const feature = this._annFeature.getFeature();
        const accessType = this._annFeature.getAccessType();

        if (feature && accessType) {
            this._setTitle(this._annFeature);
            this._setAccessCssClass(this._annFeature);
        }

        if (!this._contentElements) return;

        this._contentElements.descriptionDiv.innerHTML =
            this._annFeature.getDescriptionAsHtml();
    }

    addToMap(map: MapStore): this {
        if (this._map) return this;

        this._map = map;
        map.olMap.addOverlay(this._popup);
        this._popup.getElement()?.classList.add("annotation-layer");
        return this;
    }

    cloneOlPopup(feature: AnnotationFeature): OlPopup {
        return this._popup.cloneOlPopup(feature);
    }

    getAnnFeature(): AnnotationFeature {
        return this._annFeature;
    }

    remove(): boolean {
        if (!this._map) return false;

        this._map.olMap.removeOverlay(this._popup);
        this._map = null;
        this._contentElements = null;
        return true;
    }

    show(): void {
        const coordinates = getPopupCoordinates(this._annFeature);
        this._popup.show(coordinates, "");

        const { content, description } = this._createContentElements();

        this._popup.content.appendChild(content);

        if (this._editable) {
            document.body.classList.add("annotations-edit");
        }

        if (description) {
            description.innerHTML = this._annFeature.getDescriptionAsHtml();
        }

        this._setEditableState();
    }

    private _getAccessCssClass(annFeature: AnnotationFeature): AccessType {
        return annFeature.getAccessType();
    }

    private _setAccessCssClass(annFeature: AnnotationFeature): void {
        if (!this._popup) return;

        const popupElement = this._popup.getElement() as HTMLElement;

        if (!popupElement) return;

        popupElement.classList.remove("public", "own", "private");

        const accessType = this._getAccessCssClass(annFeature);
        if (accessType) {
            popupElement.classList.add(accessType);
        }
    }

    private _setTitle(annotationFeature: AnnotationFeature): void {
        const accessTypeTitle = annotationFeature.getAccessTypeTitle();
        if (accessTypeTitle) {
            this._popup.getElement()?.setAttribute("title", accessTypeTitle);
        }
    }

    private _createContentElements() {
        const contentElements = createPopupContent();

        this._contentElements = {
            descriptionDiv: contentElements.description,
            spanEditAnnotation: contentElements.edit,
        };
        return contentElements;
    }

    private _setEditableState(): void {
        if (!this._contentElements) return;

        const editButton = this._contentElements.spanEditAnnotation;

        editButton.addEventListener("click", this._onEditAnnotation.bind(this));
    }

    private _onEditAnnotation(): void {
        topic.publish("webmap/annotations/change/", this._annFeature);
    }
}
