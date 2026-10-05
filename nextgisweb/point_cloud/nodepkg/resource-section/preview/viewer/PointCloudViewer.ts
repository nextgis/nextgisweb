import ColorMap from "@giro3d/giro3d/core/ColorMap.js";
import Instance from "@giro3d/giro3d/core/Instance.js";
import { CoordinateSystem } from "@giro3d/giro3d/core/geographic/CoordinateSystem.js";
import { Extent } from "@giro3d/giro3d/core/geographic/Extent.js";
import { ColorLayer } from "@giro3d/giro3d/core/layer/ColorLayer.js";
import Giro3DMap from "@giro3d/giro3d/entities/Map.js";
import PointCloud from "@giro3d/giro3d/entities/PointCloud.js";
import COPCSource from "@giro3d/giro3d/sources/COPCSource.js";
import TiledImageSource from "@giro3d/giro3d/sources/TiledImageSource.js";
import { setLazPerfPath } from "@giro3d/giro3d/sources/las/config.js";
import lazPerfWasmUrl from "laz-perf/lib/web/laz-perf.wasm?url";
import type UrlTile from "ol/source/UrlTile";
import { Color, MathUtils, SRGBColorSpace, Vector3 } from "three";
import { MapControls } from "three/addons/controls/MapControls.js";

import type { PointCloudLayerRead } from "@nextgisweb/point-cloud/type/api";
import { routeURL } from "@nextgisweb/pyramid/api";

export type ColoringMode =
  | "elevation"
  | "classification"
  | "intensity"
  | "rgb"
  | "return_number";

const ATTRIBUTES: Record<ColoringMode, string> = {
  elevation: "Z",
  classification: "Classification",
  intensity: "Intensity",
  rgb: "Color",
  return_number: "ReturnNumber",
};

const ELEVATION_RAMP = ["#2b83ba", "#abdda4", "#ffffbf", "#fdae61", "#d7191c"];
const INTENSITY_RAMP = ["#000000", "#ffffff"];
const RETURN_NUMBER_COLORS = [
  "#2b83ba",
  "#abdda4",
  "#ffffbf",
  "#fdae61",
  "#d7191c",
];

// Giro3D expects 16-bit colors in the "Color" attribute, so 8-bit ones are
// composed from per-channel attributes summed by the shader
const RGB_CHANNELS = ["Red", "Green", "Blue"] as const;

const BACKGROUND_COLOR = "#f0f0f0";
const MAP_BACKGROUND_COLOR = "#d9d9d9";
const POINT_BUDGET = 2_000_000;

// Point cloud surroundings shown on the basemap, relative to its size
const MAP_MARGIN_RATIO = 1;
const MAP_MARGIN_MIN = 500;

let lazPerfConfigured = false;

function configureLazPerf() {
  if (lazPerfConfigured) return;

  // Giro3D workers load "laz-perf.wasm" from the given directory, so the
  // bundled file is used instead of the CDN default.
  const url = new URL(lazPerfWasmUrl, window.location.href);
  const directory = url.href.slice(0, url.href.lastIndexOf("/"));
  if (!url.pathname.endsWith("/laz-perf.wasm")) {
    throw new Error(`Unexpected laz-perf.wasm asset URL: ${url.href}`);
  }

  setLazPerfPath(directory);
  lazPerfConfigured = true;
}

function interpolateColors(stops: string[], count = 256): Color[] {
  const colors = stops.map((c) => new Color(c));
  return Array.from({ length: count }, (_, i) => {
    const t = (i / (count - 1)) * (colors.length - 1);
    const lo = Math.floor(t);
    const hi = Math.min(lo + 1, colors.length - 1);
    return new Color().lerpColors(colors[lo], colors[hi], t - lo);
  });
}

export class UnsupportedCoordinateSystemError extends Error {
  constructor() {
    super("Geographic coordinate systems are not supported");
    this.name = "UnsupportedCoordinateSystemError";
  }
}

/** Color map from black to the full intensity of the given RGB channel */
function channelColorMap(channel: number, max: number): ColorMap {
  const count = 256;
  const colors = Array.from({ length: count }, (_, i) => {
    const rgb = [0, 0, 0];
    rgb[channel] = i / (count - 1);
    return new Color().setRGB(rgb[0], rgb[1], rgb[2], SRGBColorSpace);
  });
  // Opacities of all channels sum up to 1
  const opacities = colors.map(() => 1 / RGB_CHANNELS.length);
  return new ColorMap({ colors, min: 0, max, opacities });
}

/**
 * Point cloud with non-negative distance to the camera
 *
 * Giro3D subtracts the node bounding sphere radius from the distance to its
 * center, which becomes negative when the camera is inside the sphere. The
 * distance is then rejected as a near plane, and the previous one is kept.
 */
class ViewerPointCloud extends PointCloud {
  override get distance() {
    const { min, max } = super.distance;
    return { min: Math.max(min, 0), max };
  }
}

function registerCoordinateSystem(data: PointCloudLayerRead) {
  if (data.srs.id === 3857) {
    return CoordinateSystem.epsg3857;
  }

  const proj4 = data.srs_proj4?.trim();
  if (!proj4) {
    throw new Error("Coordinate system definition is missing");
  }
  if (/\+proj=(longlat|latlong)\b/.test(proj4)) {
    throw new UnsupportedCoordinateSystemError();
  }

  // NextGIS Web SRS IDs aren't EPSG codes for custom coordinate systems
  return CoordinateSystem.register(`NGW:${data.srs.id}`, proj4, {
    throwIfFailedToRegisterWithProj: true,
  });
}

interface PointCloudViewerOptions {
  target: HTMLDivElement;
  resourceId: number;
  data: PointCloudLayerRead;
  coloring: ColoringMode;
}

export class PointCloudViewer {
  private readonly instance: Instance;

  private readonly data: PointCloudLayerRead;
  private readonly controls: MapControls;
  private readonly map: Giro3DMap;
  private readonly pointCloud: PointCloud;
  private basemapLayer: ColorLayer | null = null;
  private disposed = false;

  // Entities can't be configured until they are added to the instance, so the
  // settings are stored and applied once loading completes
  private loaded = false;
  private coloring: ColoringMode;
  private pointSize: number | null = null;
  private basemapSource: UrlTile | null = null;

  constructor({ target, resourceId, data, coloring }: PointCloudViewerOptions) {
    configureLazPerf();

    this.data = data;
    const crs = registerCoordinateSystem(data);

    this.instance = new Instance({
      target,
      crs,
      backgroundColor: BACKGROUND_COLOR,
    });
    this.instance.renderingOptions.enableEDL = true;

    this.map = new Giro3DMap({
      extent: this.mapExtent(crs),
      backgroundColor: MAP_BACKGROUND_COLOR,
      lighting: false,
    });

    this.pointCloud = new ViewerPointCloud({
      source: new COPCSource({
        url: new URL(
          routeURL("point_cloud.copc", resourceId),
          window.location.href
        ).href,
      }),
    });
    this.pointCloud.pointBudget = POINT_BUDGET;

    // Convert Z to horizontal units and put the lowest point on the basemap
    const object3d = this.pointCloud.object3d;
    object3d.scale.z = data.z_scale;
    object3d.position.z = -data.zmin * data.z_scale;
    object3d.updateMatrixWorld(true);

    this.controls = new MapControls(
      this.instance.view.camera,
      this.instance.domElement
    );
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.2;
    this.instance.view.setControls(this.controls);
    this.fitCamera();

    this.coloring = coloring;
  }

  /** Adds entities to the scene, resolves when the point cloud is ready */
  async load() {
    await this.instance.add(this.map);
    await this.instance.add(this.pointCloud);
    if (this.disposed) return;

    this.loaded = true;
    this.setupColorMaps();
    this.applyColoring();
    this.applyPointSize();
    await this.applyBasemap();
    this.instance.notifyChange();
  }

  setColoring(mode: ColoringMode) {
    this.coloring = mode;
    if (this.loaded) this.applyColoring();
  }

  setPointSize(size: number) {
    this.pointSize = size;
    if (this.loaded) this.applyPointSize();
  }

  /** Replaces the basemap, `null` source removes it */
  async setBasemap(source: UrlTile | null) {
    this.basemapSource = source;
    if (this.loaded) await this.applyBasemap();
  }

  private applyColoring() {
    const pc = this.pointCloud;
    pc.setColoringMode("attribute");
    if (this.coloring === "rgb" && this.rgbByChannels) {
      pc.setActiveAttributes(RGB_CHANNELS.map((name) => ({ name, weight: 1 })));
    } else {
      pc.setActiveAttribute(ATTRIBUTES[this.coloring]);
    }
    this.instance.notifyChange(pc);
  }

  private get rgbByChannels() {
    return this.data.rgb_max !== null && this.data.rgb_max < 65535;
  }

  private applyPointSize() {
    if (this.pointSize === null) return;
    this.pointCloud.pointSize = this.pointSize;
    this.instance.notifyChange(this.pointCloud);
  }

  private async applyBasemap() {
    const source = this.basemapSource;
    if (this.basemapLayer) {
      this.map.removeLayer(this.basemapLayer, { disposeLayer: true });
      this.basemapLayer = null;
    }

    if (source) {
      const layer = new ColorLayer({
        source: new TiledImageSource({ source }),
      });
      this.basemapLayer = layer;
      await this.map.addLayer(layer);
      if (this.disposed || this.basemapLayer !== layer) return;
    }

    this.instance.notifyChange(this.map);
  }

  dispose() {
    if (this.disposed) return;
    this.disposed = true;

    this.instance.view.setControls(null);
    this.controls.dispose();
    this.instance.dispose();
    this.instance.renderer.forceContextLoss();
  }

  private mapExtent(crs: CoordinateSystem) {
    const { minx, miny, maxx, maxy } = this.data;
    const size = Math.max(maxx - minx, maxy - miny);
    const margin = Math.max(size * MAP_MARGIN_RATIO, MAP_MARGIN_MIN);
    return new Extent(crs, minx, maxx, miny, maxy).withMargin(margin, margin);
  }

  private setupColorMaps() {
    const { zmin, zmax } = this.data;
    const pc = this.pointCloud;

    pc.setAttributeColorMap(
      ATTRIBUTES.elevation,
      new ColorMap({
        colors: interpolateColors(ELEVATION_RAMP),
        min: zmin,
        max: zmax > zmin ? zmax : zmin + 1,
      })
    );

    pc.setAttributeColorMap(
      ATTRIBUTES.intensity,
      new ColorMap({
        colors: interpolateColors(INTENSITY_RAMP),
        min: 0,
        max: 65535,
      })
    );

    if (this.rgbByChannels) {
      RGB_CHANNELS.forEach((name, channel) => {
        pc.setAttributeColorMap(
          name,
          channelColorMap(channel, this.data.rgb_max!)
        );
      });
    }

    pc.setAttributeColorMap(
      ATTRIBUTES.return_number,
      new ColorMap({
        colors: RETURN_NUMBER_COLORS.map((c) => new Color(c)),
        min: 1,
        max: RETURN_NUMBER_COLORS.length,
      })
    );
  }

  private fitCamera() {
    const { minx, miny, maxx, maxy, zmin, zmax, z_scale } = this.data;

    const height = (zmax - zmin) * z_scale;
    const center = new Vector3((minx + maxx) / 2, (miny + maxy) / 2, 0);
    const radius =
      new Vector3(maxx - minx, maxy - miny, height).length() / 2 || 1;

    const camera = this.instance.view.camera;
    const fov = "fov" in camera ? MathUtils.degToRad(camera.fov) : Math.PI / 4;
    const distance = radius / Math.sin(fov / 2);

    // Oblique view from the south
    const tilt = MathUtils.degToRad(45);
    camera.position.set(
      center.x,
      center.y - distance * Math.sin(tilt),
      center.z + distance * Math.cos(tilt)
    );
    camera.lookAt(center);
    camera.near = distance / 1000;
    camera.far = distance * 100;
    camera.updateProjectionMatrix();

    this.controls.target.copy(center);
    this.controls.maxDistance = distance * 10;
    this.controls.saveState();
    this.controls.update();
  }
}
