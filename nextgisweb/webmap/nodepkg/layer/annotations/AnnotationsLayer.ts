import type { Feature } from "ol";
import { Vector as VectorLayer } from "ol/layer";
import { Vector as VectorSource } from "ol/source";

import type { MapStore } from "../../ol/MapStore";
import type { ExtendedOlLayer } from "../../ol/layer/CoreLayer";
import VectorLayerClass from "../../ol/layer/Vector";

import { AnnotationFeature } from "./AnnotationFeature";
import type { AnnotationInfo } from "./AnnotationFeature";
import type { AnnotationsPopup } from "./AnnotationsPopup";

export interface AccessFilter {
    public: boolean;
    own: boolean;
    private: boolean;
}

export class AnnotationsLayer {
    private _layer: VectorLayerClass;
    private _source: VectorSource;
    private _map: MapStore | null = null;
    private _popupsVisible: boolean | null = null;
    private _editable = false;
    private _filter: AccessFilter = {
        public: true,
        own: true,
        private: false,
    };

    constructor({
        editable,
        visible,
    }: {
        editable?: boolean;
        visible?: boolean;
    } = {}) {
        this._editable = editable ?? false;
        this._source = new VectorSource();
        this._layer = new VectorLayerClass("", {
            title: "annotations",
            visible,
        });
        this._layer.getLayer().setSource(this._source);

        const olLayer = this._layer.getLayer() as ExtendedOlLayer;
        olLayer.printingCopy = () => {
            const newSource = new VectorSource({
                features: this._source.getFeatures().map((feature) => {
                    const clonedFeature = feature.clone();
                    const annFeature = feature.get("annFeature");
                    if (annFeature) {
                        clonedFeature.set("annFeature", annFeature);
                    }

                    const popup = feature.get("popup");
                    if (popup) {
                        clonedFeature.set("popup", popup);
                    }
                    clonedFeature.setStyle(feature.getStyle());
                    return clonedFeature;
                }),
            });

            const newLayer = new VectorLayer({
                source: newSource,
                visible: this._layer.getLayer().getVisible(),
                opacity: this._layer.getLayer().getOpacity(),
                zIndex: this._layer.getLayer().getZIndex(),
            });

            return newLayer;
        };
    }

    addToMap(map: MapStore): void {
        this._map = map;
        map.addLayer(this._layer);
    }

    getSource(): VectorSource {
        return this._source;
    }

    fillAnnotations(annotationsInfo: AnnotationInfo[]): void {
        const annotationFeatures = annotationsInfo.map(
            (annotationInfo) =>
                new AnnotationFeature({
                    annotationInfo,
                    editable: this._editable,
                })
        );

        annotationFeatures.forEach((annotationFeature) => {
            const feature = annotationFeature.getFeature();
            if (feature) {
                this._source.addFeature(feature);
            }
        });

        this.redrawFilter();
    }

    getLayer(): VectorLayerClass {
        return this._layer;
    }

    showPopups(): void {
        this._popupsVisible = true;
        this.redrawFilter();
    }

    showPopup(annotationFeature: AnnotationFeature): void {
        if (this._map) {
            annotationFeature.togglePopup(true, this._map);
        }
    }

    setZIndex(zIndex: number) {
        this._layer.setZIndex(zIndex);
    }

    hidePopups(): void {
        const features = this._source.getFeatures();
        features.forEach((feature) => {
            const annFeature = feature.get("annFeature") as AnnotationFeature;
            annFeature.togglePopup(false);
        });
        this._popupsVisible = false;
    }

    removeAnnFeature(annFeature: AnnotationFeature): void {
        const olFeature = annFeature.getFeature();
        if (olFeature) {
            const popup = olFeature.get("popup") as AnnotationsPopup;
            popup.remove();
            this._source.removeFeature(olFeature);
            annFeature.clearOlFeature();
        }
    }

    getFilter(): AccessFilter {
        return this._filter;
    }

    applyFilter(filter: AccessFilter): void {
        this._filter = filter;
        this.redrawFilter();
    }

    redrawFilter(): void {
        const features = this._source.getFeatures();
        const filter = this._filter;

        features.forEach((feature: Feature) => {
            const annFeature = feature.get("annFeature") as AnnotationFeature;
            const accessType = annFeature.getAccessType();

            if (!accessType) return;

            const visible = filter ? filter[accessType] : true;

            annFeature.toggleVisible(visible);
            annFeature.togglePopup(
                this._popupsVisible ? visible : false,
                this._map ?? undefined
            );
        });
    }
}
