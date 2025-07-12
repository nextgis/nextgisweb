import { action, computed, observable } from "mobx";
import Feature from "ol/Feature";
import { WKT } from "ol/format";
import {
    LineString,
    MultiLineString,
    MultiPoint,
    MultiPolygon,
    Point,
    Polygon,
} from "ol/geom";
import type { Geometry } from "ol/geom";
import { transformExtent } from "ol/proj";
import VectorSource from "ol/source/Vector";

import type {
    EditorStore,
    EditorStoreConstructorOptions,
    FeatureItem,
} from "@nextgisweb/feature-layer/type";
import type { FeaureLayerGeometryType } from "@nextgisweb/feature-layer/type/api";
import { assert } from "@nextgisweb/jsrealm/error";
import type { ExtentWSEN } from "@nextgisweb/webmap/type/api";

import type { FeatureEditorStore } from "../feature-editor/FeatureEditorStore";
import { featuresToWkt } from "../util/featuresToWKT";

export type FeatureGeometry = FeatureItem["geom"];
type NonMultiGeometryType = Exclude<FeaureLayerGeometryType, `MULTI${string}`>;

class GeometryEditorStore implements EditorStore<FeatureGeometry | null> {
    readonly _parentStore?: FeatureEditorStore;

    @observable.ref accessor source = new VectorSource();
    @observable.ref accessor value: FeatureGeometry | null = null;
    @observable.ref private accessor _initValue: FeatureGeometry | null = null;

    private wkt = new WKT();

    constructor({ parentStore }: EditorStoreConstructorOptions = {}) {
        this._parentStore = parentStore;
        this.source.on("change", this.onSourceChange);
    }

    @action
    load(value: FeatureGeometry | null) {
        this.value = value;
        this._initValue = value;
        this.source.clear();
        if (!value) {
            return;
        }

        const geom = this.wkt.readGeometry(value) as Geometry;

        const makeFeature = (g: Geometry) => new Feature({ geometry: g });

        if (geom instanceof MultiPoint) {
            (geom as MultiPoint)
                .getCoordinates()
                .forEach((coords) =>
                    this.source.addFeature(makeFeature(new Point(coords)))
                );
        } else if (geom instanceof MultiLineString) {
            (geom as MultiLineString)
                .getCoordinates()
                .forEach((coords) =>
                    this.source.addFeature(makeFeature(new LineString(coords)))
                );
        } else if (geom instanceof MultiPolygon) {
            (geom as MultiPolygon)
                .getCoordinates()
                .forEach((coords) =>
                    this.source.addFeature(makeFeature(new Polygon(coords)))
                );
        } else {
            this.source.addFeature(makeFeature(geom));
        }
    }

    @computed
    get initExtent(): ExtentWSEN | undefined {
        if (!this._initValue) {
            return undefined;
        }
        const geom = this.wkt.readGeometry(this._initValue);
        const extent = geom.getExtent();
        return transformExtent(extent, "EPSG:3857", "EPSG:4326") as ExtentWSEN;
    }

    @computed
    get isReady(): boolean {
        if (this._parentStore) {
            return !this._parentStore.initLoading;
        }
        return true;
    }
    @computed
    get vectorLayerGeometryType(): FeaureLayerGeometryType | undefined {
        if (this._parentStore) {
            return this._parentStore.vectorLayer?.geometry_type;
        }
    }

    @computed
    get geometryType(): NonMultiGeometryType | undefined {
        // Strip the MULTI prefix so geometries are edited as single features (Point, LineString, Polygon).
        // Otherwise, every edit would result in a MULTI* geometry containing just one member.
        // The store’s onSourceChange will rebuild MULTI geometries when serializing to WKT.
        return this.vectorLayerGeometryType?.replace(
            "MULTI",
            ""
        ) as NonMultiGeometryType;
    }

    @computed
    get multiGeometry(): boolean | undefined {
        return this.vectorLayerGeometryType?.startsWith("MULTI");
    }

    @computed
    get dirty(): boolean {
        return this.value !== this._initValue;
    }

    @computed
    get saving(): boolean {
        if (this._parentStore) {
            return this._parentStore.saving;
        }
        return false;
    }

    @action.bound
    setValue(value: FeatureGeometry | null) {
        this.value = value;
    }

    private onSourceChange = () => {
        const feats = this.source.getFeatures();

        const type = this.vectorLayerGeometryType;
        assert(type);

        if (feats.length === 0) {
            this.setValue(null);
            return;
        }

        const wkt = featuresToWkt(feats, type, this.multiGeometry);

        this.setValue(wkt);
    };
}

export default GeometryEditorStore;
