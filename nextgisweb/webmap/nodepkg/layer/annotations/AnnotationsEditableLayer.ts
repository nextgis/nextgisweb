import type { Feature, Map } from "ol";
import { never } from "ol/events/condition";
import { Draw } from "ol/interaction";
import type { Vector as VectorSource } from "ol/source";

import { assert } from "@nextgisweb/jsrealm/error";
import topic from "@nextgisweb/webmap/compat/topic";

import VectorLayerClass from "../../ol/layer/Vector";

import type { AnnotationsLayer } from "./AnnotationsLayer";

export const annotationGeometryTypes = [
    "Point",
    "LineString",
    "Polygon",
] as const;

export type AnnotationGeometryType = (typeof annotationGeometryTypes)[number];

interface WebMapInstance {
    olMap: Map;
    addLayer(layer: VectorLayerClass): void;
    removeLayer(layer: VectorLayerClass): void;
}

export class AnnotationsEditableLayer {
    private _map: WebMapInstance;
    private _editableLayer: VectorLayerClass | null = null;
    private _source: VectorSource | null = null;
    private _draw: Draw | null = null;

    constructor(map: WebMapInstance) {
        this._map = map;
    }

    activate(
        annotationsLayer: AnnotationsLayer,
        geometryType: AnnotationGeometryType
    ): void {
        this._editableLayer = new VectorLayerClass("", {
            title: "editor.overlay",
        });

        this._source = annotationsLayer.getSource();
        this._editableLayer.getLayer().setSource(this._source);
        this._map.addLayer(this._editableLayer);
        this._setInteractions(geometryType);
    }

    deactivate(): void {
        this._offInteractions();
        if (this._editableLayer) {
            this._map.removeLayer(this._editableLayer);
            this._editableLayer = null;
        }
        this._source = null;
    }

    changeGeometryType(geometryType: AnnotationGeometryType): void {
        this._offInteractions();
        this._setInteractions(geometryType);
    }

    private _setInteractions(geometryType: AnnotationGeometryType): void {
        assert(this._source);
        this._draw = new Draw({
            source: this._source,
            type: geometryType,
            freehandCondition: never,
        });

        this._draw.on("drawend", (e: { feature: Feature }) => {
            topic.publish(
                "webmap/annotations/layer/feature/created",
                e.feature
            );
        });

        this._map.olMap.addInteraction(this._draw);
        this._draw.setActive(true);
    }

    private _offInteractions(): void {
        if (this._draw) {
            this._map.olMap.removeInteraction(this._draw);
            this._draw = null;
        }
    }
}
