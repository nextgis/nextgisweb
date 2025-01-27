import { Feature } from "ol";
import { WKT } from "ol/format";
import type { Geometry } from "ol/geom";
import type VectorSource from "ol/source/Vector";
import { Circle, Stroke, Style } from "ol/style";

import { route } from "@nextgisweb/pyramid/api";
import topic from "@nextgisweb/webmap/compat/topic";
import Vector from "@nextgisweb/webmap/ol/layer/Vector";

import type { MapStore } from "../ol/MapStore";

interface HighlightEvent {
    geom?: string;
    olGeometry?: Geometry;
    layerId?: number;
    featureId?: number;
    feature?: Feature;
}

interface FeatureFilterFn {
    (feature: Feature): boolean;
}

export class FeatureHighlighter {
    private _map: MapStore;
    private _source: VectorSource;
    private _overlay: Vector;
    private _wkt: WKT;
    private _zIndex = 1000;

    constructor(map: MapStore, highlightStyle?: Style) {
        this._map = map;
        this._zIndex = this._zIndex + Object.keys(map.layers).length;
        this._wkt = new WKT();

        this._overlay = new Vector("highlight", {
            title: "Highlight Overlay",
            style: highlightStyle ?? this._getDefaultStyle(),
        });
        this._overlay.olLayer.setZIndex(this._zIndex);
        const source = this._overlay.olLayer.getSource();
        if (!source) {
            throw new Error(`There is no source for feature hightlight layer`);
        }
        this._source = source;

        this._bindEvents();

        this._map.addLayer(this._overlay);
    }

    private _getDefaultStyle(): Style {
        const strokeStyle = new Stroke({
            width: 3,
            color: "rgba(255,255,0,1)",
        });

        return new Style({
            stroke: strokeStyle,
            image: new Circle({
                stroke: strokeStyle,
                radius: 5,
            }),
        });
    }

    private _bindEvents(): void {
        topic.subscribe("feature.highlight", (e: HighlightEvent) =>
            this._highlightFeature(e)
        );
        topic.subscribe("feature.unhighlight", (filter?: FeatureFilterFn) =>
            this._unhighlightFeature(filter)
        );
    }

    private _highlightFeature(e: HighlightEvent): Feature {
        let geometry: Geometry;
        this._source.clear();

        let feature: Feature;
        if (e.feature) {
            feature = e.feature;
        } else {
            if (e.geom) {
                geometry = this._wkt.readGeometry(e.geom);
            } else if (e.olGeometry) {
                geometry = e.olGeometry;
            } else {
                throw new Error("No geometry provided");
            }

            feature = new Feature({
                geometry,
                layerId: e.layerId,
                featureId: e.featureId,
            });
        }

        this._source.addFeature(feature);

        return feature;
    }

    private _unhighlightFeature(filter?: FeatureFilterFn): void {
        if (filter) {
            const features = this._source.getFeatures();
            for (const feature of features) {
                if (filter(feature)) {
                    this._source.removeFeature(feature);
                }
            }
        } else {
            this._source.clear();
        }
    }

    /**
     * Add highlited layer to the map
     * @param {Polygon} e.geom - polygonal geometry
     * @param {int} [e.layerId] - resource id by which layer highlited
     * @param {int} [e.featureId] - feature id by which layer highlited
     */
    highlightFeature(e: HighlightEvent): Feature {
        return this._highlightFeature(e);
    }

    /**
     * Callback for filtering features.
     *
     * @callback filterFeatures
     * @param {ol.Feature} feature - An integer.
     * @return {boolean} - is feature satisfy filter
     */

    /**
     * Remove highligh layer from the map
     * @param {filterFeatures} [filter] - callback for filtering features to be removed from the map
     */
    unhighlightFeature(filter?: FeatureFilterFn): void {
        this._unhighlightFeature(filter);
    }

    getHighlighted(): Feature[] {
        return this._source.getFeatures();
    }

    async highlightFeatureById(
        featureId: number,
        layerId: number
    ): Promise<Feature> {
        const feature = await route("feature_layer.feature.item", {
            id: layerId,
            fid: featureId,
        }).get();

        return this._highlightFeature({
            geom: feature.geom,
            featureId: featureId,
            layerId: layerId,
        });
    }
}
