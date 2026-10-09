import { actionBound, observableRef } from "mobx";
import { getWorldsAway } from "ol/coordinate";
import type { Coordinate } from "ol/coordinate";
import { boundingExtent, getCenter, getWidth } from "ol/extent";
import { GeoJSON, WKT } from "ol/format";
import { MultiPolygon, Polygon } from "ol/geom";
import { fromExtent } from "ol/geom/Polygon";
import { get as getProjection } from "ol/proj";

import type { FeatureItem } from "@nextgisweb/feature-layer/type";
import { route } from "@nextgisweb/pyramid/api/route";
import type { RouteQuery } from "@nextgisweb/pyramid/api/type";
import { gettext } from "@nextgisweb/pyramid/i18n";
import type {
  RasterLayerIdentifyItem,
  RasterLayerIdentifyResponse,
} from "@nextgisweb/raster-layer/type/api";
import webmapSettings from "@nextgisweb/webmap/client-settings";
import type { Display } from "@nextgisweb/webmap/display";
import type { MapStore } from "@nextgisweb/webmap/ol/MapStore";
import type IdentifyStore from "@nextgisweb/webmap/panel/identify/IdentifyStore";
import type {
  FeatureResponse,
  IdentifyInfo,
  IdentifyInfoItem,
  IdentifyResponse,
} from "@nextgisweb/webmap/panel/identify/identification";

const geojson = new GeoJSON();
const wkt = new WKT();

interface IdentifyOptions {
  display: Display;
}

interface Request {
  srs: number;
  geom: string;
  layers: number[];
}

export class Identify {
  label = gettext("Identify");
  iconClass = "iconIdentify";
  pixelRadius: number = webmapSettings.identify_radius || 10;

  map: MapStore;
  display: Display;

  @observableRef accessor active = true;
  @observableRef accessor identifyInfo: IdentifyInfo | null = null;

  constructor(options: IdentifyOptions) {
    this.display = options.display;
    this.map = this.display.map;
  }

  @actionBound
  activate(): void {
    this.active = true;
  }

  deactivate(): void {
    this.active = false;
  }

  @actionBound
  clear() {
    this.identifyInfo = null;
    this.display.highlighter.unhighlight();

    const pm = this.display.panelManager;
    const pkey = "identify";
    const panel = pm.getPanel<IdentifyStore>(pkey);
    if (panel) {
      panel.setIdentifyInfo(undefined);
    }
  }

  async highlightItem(
    identifyInfo: IdentifyInfo,
    item: IdentifyInfoItem,
    opt: { signal: AbortSignal }
  ): Promise<FeatureItem | undefined> {
    const layerResponse = identifyInfo.response[item.layerId];
    if (!layerResponse) return;

    if (item.type === "feature_layer" && "features" in layerResponse) {
      const featureResponse = layerResponse.features[item.idx];

      const featureItem = await route("feature_layer.feature.item", {
        id: featureResponse.layerId,
        fid: featureResponse.id,
      }).get({ query: { dt_format: "iso" }, ...opt });

      this.display.highlighter.highlight({
        geom: wkt.readGeometry(featureItem.geom),
        featureId: featureItem.id,
        layerId: item.layerId,
      });

      return featureItem;
    }

    if (item.type === "raster_layer" && "pixel_geom" in layerResponse) {
      const geom = await this._readRasterPixelGeometry(layerResponse, opt);

      this.display.highlighter.highlight({
        geom,
        layerId: item.layerId,
      });
    }
  }

  private async _readRasterPixelGeometry(
    item: RasterLayerIdentifyItem,
    opt: { signal: AbortSignal }
  ): Promise<Polygon> {
    let geometry = geojson.readGeometry(item.pixel_geom);

    if (item.srs_id !== this.map.displaySrsId) {
      const transformed = await route("spatial_ref_sys.geom_transform", {
        id: this.map.displaySrsId,
      }).post({
        json: {
          srs: item.srs_id,
          geom: wkt.writeGeometry(geometry),
        },
        ...opt,
      });
      geometry = wkt.readGeometry(transformed.geom);
    }

    if (!(geometry instanceof Polygon)) {
      throw new Error("Raster pixel geometry must be a polygon");
    }

    return geometry;
  }

  async identifyFeatureByAttrValue(
    layerId: number,
    attrName: string,
    attrValue: string | number,
    zoom?: number
  ): Promise<boolean> {
    const layerInfo = await route("resource.item", {
      id: layerId,
    }).get();

    const query: RouteQuery<"feature_layer.feature.collection", "get"> & {
      [key: `fld_${string}`]: string | number;
    } = {
      limit: 1,
      dt_format: "iso",
    };
    query[`fld_${attrName}__eq`] = attrValue;

    const features = await route("feature_layer.feature.collection", {
      id: layerId,
    }).get({ query });

    if (features.length !== 1) {
      return false;
    }

    const foundFeature = features[0];
    const responseLayerId = layerInfo.resource.id;
    const labelField = layerInfo.feature_layer?.fields.find(
      (f) => f.label_field
    );

    const label = labelField
      ? foundFeature.fields[labelField.keyname]
      : undefined;

    const identifyResponse: FeatureResponse = {
      featureCount: 1,
      [responseLayerId]: {
        featureCount: 1,
        features: [
          {
            fields: foundFeature.fields,
            id: foundFeature.id,
            label: label ?? `#${foundFeature.id}`,
            layerId: responseLayerId,
          },
        ],
      },
    };

    const geometry = wkt.readGeometry(foundFeature.geom);
    const extent = geometry.getExtent();
    const center = getCenter(extent);

    const layerLabels: Record<number, string> = {};
    layerLabels[responseLayerId] = layerInfo.resource.display_name;

    await this.openIdentifyPanel({
      features: identifyResponse,
      point: center,
      layerLabels,
    });

    if (zoom) {
      this.map.setPosition({ center, zoom });
    } else {
      this.map.zoomToExtent(extent);
    }
    return true;
  }

  async execute(pixel: number[], radiusScale?: number): Promise<void> {
    const point = this.map.adapter.getCoordinateFromPixel(pixel);
    const geom = this._requestGeomString(pixel, radiusScale);
    if (!point || !geom) return;

    const request: Request = {
      srs: this.map.displaySrsId,
      geom,
      layers: [],
    };

    const items = await this.display.getVisibleItems();

    const rasterLayers: number[] = [];

    items.forEach((item) => {
      const shouldIdentify = item.identifiable && !item.isOutOfScaleRange;

      if (shouldIdentify && item.identification) {
        if (item.identification.mode === "feature_layer") {
          request.layers.push(item.identification.resource.id);
        } else if (item.identification.mode === "raster_layer") {
          rasterLayers.push(item.identification.resource.id);
        }
      }
    });

    const layerLabels: Record<number, string | null> = {};
    items.forEach((i) => {
      const layerId = i.layerId;
      layerLabels[layerId] = i.label;
    });

    let features: FeatureResponse | undefined = undefined;
    if (request.layers.length) {
      features = await route("feature_layer.identify").post({
        json: request,
      });
    }

    let raster: RasterLayerIdentifyResponse | undefined;
    if (rasterLayers.length) {
      const [x, y] = point;
      raster = await route("raster_layer.identify").get({
        query: { resources: rasterLayers, x, y },
      });
    }

    await this.openIdentifyPanel({ features, point, layerLabels, raster });
  }

  private _requestGeomString(
    pixel: number[],
    radiusScale = 1
  ): string | undefined {
    const adapter = this.map.adapter;
    const radius = this.pixelRadius * radiusScale;
    const center = adapter.getCoordinateFromPixel(pixel);
    if (!center) return;
    const [x, y] = pixel;
    const pixels = [
      [x - radius, y - radius],
      [x + radius, y - radius],
      [x + radius, y + radius],
      [x - radius, y + radius],
    ];
    const projection = getProjection(this.map.displayProjection);
    const world = projection?.canWrapX() ? projection.getExtent() : undefined;
    const width = world ? getWidth(world) : 0;
    const coordinates = pixels.map((pixel) => {
      const coordinate = adapter.getCoordinateFromPixel(pixel);
      if (coordinate && width) {
        coordinate[0] +=
          Math.round((center[0] - coordinate[0]) / width) * width;
      }
      return coordinate;
    });

    let rangeGeom: Polygon;
    if (coordinates.every((coordinate) => coordinate !== undefined)) {
      const ring = coordinates as number[][];
      rangeGeom = new Polygon([[...ring, ring[0]]]);
    } else {
      // At the horizon some corners miss the ground; retain a nonzero tolerance.
      const resolution =
        adapter.getViewState()?.resolution ?? this.map.resolution ?? 0;
      const distance = radius * resolution;
      const points = coordinates.filter(
        (coordinate) => coordinate !== undefined
      );
      rangeGeom = fromExtent(
        boundingExtent([
          ...points,
          [center[0] - distance, center[1] - distance],
          [center[0] + distance, center[1] + distance],
        ])
      );
    }

    // Workaround for identify outside the 180 meridian.
    if (projection && width) {
      const bounds = rangeGeom.getExtent();
      const worldsAway =
        getWorldsAway(center, projection) ||
        Math.sign(
          getWorldsAway([bounds[0], center[1]], projection) ||
            getWorldsAway([bounds[2], center[1]], projection)
        );
      if (worldsAway) {
        const wrapped = rangeGeom.clone();
        wrapped.translate(-worldsAway * width, 0);
        const multi = new MultiPolygon([rangeGeom, wrapped]);
        return wkt.writeGeometry(multi);
      }
    }

    return wkt.writeGeometry(rangeGeom);
  }

  @actionBound
  private async openIdentifyPanel({
    features,
    point,
    layerLabels,
    raster,
  }: {
    features?: FeatureResponse;

    point: Coordinate;
    layerLabels: Record<string, string | null>;
    raster?: RasterLayerIdentifyResponse;
  }): Promise<void> {
    const response: IdentifyResponse = features || { featureCount: 0 };

    if (response.featureCount === 0) {
      this.identifyInfo = null;
      this.display.highlighter.unhighlight();
    }

    if (raster) {
      for (const item of raster.items) {
        response[item.resource.id] = item;
        response.featureCount += 1;
      }
    }

    const identifyInfo: IdentifyInfo = {
      point,
      response,
      layerLabels,
    };

    this.identifyInfo = identifyInfo;

    const pm = this.display.panelManager;
    const pkey = "identify";
    const panelPlugin = await pm.registerPlugin(pkey);

    const panel =
      panelPlugin?.type === "widget"
        ? (pm.getPanel(pkey) as IdentifyStore | undefined)
        : undefined;

    if (panel) {
      panel.setIdentifyInfo(identifyInfo);
    } else {
      throw new Error(
        "Identification panel should add during Display initialization"
      );
    }

    const activePanel = pm.getActivePanelName();
    if (activePanel !== pkey) {
      pm.activatePanel(pkey);
    }
  }
}
