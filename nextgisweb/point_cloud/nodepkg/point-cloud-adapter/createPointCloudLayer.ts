import { Copc } from "copc";
import createLazPerf from "laz-perf/lib/web/laz-perf.js";
import lazPerfWasmUrl from "laz-perf/lib/web/laz-perf.wasm?url";
import Feature from "ol/Feature";
import { unByKey } from "ol/Observable";
import { asArray as colorAsArray } from "ol/color";
import type { EventsKey } from "ol/events";
import Point from "ol/geom/Point";
import WebGLPointsLayer from "ol/layer/WebGLPoints";
import { getTransform } from "ol/proj";
import { Vector as VectorSource } from "ol/source";
import type { Options as VectorSourceOptions } from "ol/source/Vector";
import type { FlatStyle } from "ol/style/flat";

import { isAbortError } from "@nextgisweb/gui/error";
import { route, routeURL } from "@nextgisweb/pyramid/api";
import type { CreateDisplayAdapterLayerOptions } from "@nextgisweb/webmap/DisplayLayerAdapter";
import type { MapStore } from "@nextgisweb/webmap/ol/MapStore";
import { CoreLayer } from "@nextgisweb/webmap/ol/layer/CoreLayer";
import type { LayerOptions } from "@nextgisweb/webmap/ol/layer/CoreLayer";
import type { LayerItemConfig } from "@nextgisweb/webmap/type/api";

import {
  buildHierarchyNodeEntry,
  selectHierarchyNodesForView,
} from "./pointCloudLod";
import type { HierarchyNodeEntry } from "./pointCloudLod";
import { createPointCloudCoordinateTransform } from "./pointCloudProjection";
import {
  createFeatureColors,
  getPointCloudLayerStyleVariables,
} from "./pointCloudStyle";
import type {
  PointCloudResourceItem,
  PointCloudStyleConfig,
  PointCloudStyleResourceItem,
  PointCloudViewState,
  RawPoint,
} from "./type";

const POINT_BUDGET = 15000;
const PAGE_LOAD_LIMIT = 32;
const HIERARCHY_NODE_CACHE_LIMIT = 8192;
const VIEW_REFRESH_DEBOUNCE_MS = 120;
const DEBUG_MIN_POINT_SIZE = 4;
const DEBUG_MIN_OPACITY = 0.85;
const DEBUG_Z_INDEX = 10;
const DEBUG_STROKE_WIDTH = 1;
const DEBUG_STROKE_COLOR = "#ffffff";

let lazPerfPromise: Promise<Awaited<ReturnType<typeof createLazPerf>>> | null =
  null;

const LOG_PREFIX = "[PointCloudAdapter]";
const WEB_MERCATOR_LIMIT = 20037508.342789244;
const DEFAULT_MAP_SIZE: [number, number] = [1024, 768];

type PointCloudTransform = (coordinate: [number, number]) => [number, number];
type RangeGetter = ReturnType<typeof createRangeGetter>;

type BootstrapState = {
  parentId: number;
  sourceUrl: string;
  sourceProjection: string;
  projectionSource: string;
  pointCloud: PointCloudResourceItem["point_cloud"] & {};
  styleConfig: PointCloudStyleConfig;
  copc: Awaited<ReturnType<typeof Copc.create>>;
  hierarchyNodes: HierarchyNodeEntry[];
  transformCoordinate: PointCloudTransform;
  inverseTransformCoordinate: PointCloudTransform;
};

function logInfo(message: string, details?: unknown) {
  if (details === undefined) {
    console.info(LOG_PREFIX, message);
  } else {
    console.info(LOG_PREFIX, message, details);
  }
}

function roundNumber(value: number, digits = 3) {
  return Number.isFinite(value) ? Number(value.toFixed(digits)) : value;
}

function getWebGLStyleVariables(styleConfig: PointCloudStyleConfig) {
  return {
    pointSize: Math.max(styleConfig.point_size, DEBUG_MIN_POINT_SIZE),
    pointOpacity: Math.max(styleConfig.opacity / 100, DEBUG_MIN_OPACITY),
  };
}

function createWebGLPointStyle(): FlatStyle {
  return {
    "circle-radius": ["var", "pointSize"],
    "circle-fill-color": [
      "color",
      ["get", "colorR"],
      ["get", "colorG"],
      ["get", "colorB"],
      ["var", "pointOpacity"],
    ],
    "circle-opacity": ["var", "pointOpacity"],
    "circle-stroke-color": DEBUG_STROKE_COLOR,
    "circle-stroke-width": DEBUG_STROKE_WIDTH,
  };
}

function summarizePoints(points: RawPoint[]) {
  if (!points.length) {
    return { count: 0 };
  }

  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);
  const zs = points.map((point) => point.z);
  const invalidCount = points.filter(
    (point) =>
      !Number.isFinite(point.x) ||
      !Number.isFinite(point.y) ||
      !Number.isFinite(point.z)
  ).length;
  const outsideWebMercatorCount = points.filter(
    (point) =>
      Math.abs(point.x) > WEB_MERCATOR_LIMIT ||
      Math.abs(point.y) > WEB_MERCATOR_LIMIT
  ).length;

  return {
    count: points.length,
    invalidCount,
    outsideWebMercatorCount,
    sample: points.slice(0, 5).map((point) => ({
      x: roundNumber(point.x),
      y: roundNumber(point.y),
      z: roundNumber(point.z),
      intensity: point.intensity,
      classification: point.classification,
      returnNumber: point.returnNumber,
      rgb: point.rgb,
    })),
    extent: {
      minx: roundNumber(Math.min(...xs)),
      miny: roundNumber(Math.min(...ys)),
      maxx: roundNumber(Math.max(...xs)),
      maxy: roundNumber(Math.max(...ys)),
      zmin: roundNumber(Math.min(...zs)),
      zmax: roundNumber(Math.max(...zs)),
    },
  };
}

function buildPointCloudSourceUrl(
  resourceId: number,
  externalUrl?: string | null
) {
  return externalUrl || routeURL("point_cloud.content", resourceId);
}

function buildPointCloudSourceExtent(
  pointCloud: BootstrapState["pointCloud"]
): [number, number, number, number] {
  return [pointCloud.minx, pointCloud.miny, pointCloud.maxx, pointCloud.maxy];
}

function intersectExtents(
  left: [number, number, number, number],
  right: [number, number, number, number]
): [number, number, number, number] | null {
  const minx = Math.max(left[0], right[0]);
  const miny = Math.max(left[1], right[1]);
  const maxx = Math.min(left[2], right[2]);
  const maxy = Math.min(left[3], right[3]);

  if (minx > maxx || miny > maxy) {
    return null;
  }

  return [minx, miny, maxx, maxy];
}

function transformExtentWith(
  extent: [number, number, number, number],
  transformCoordinate: PointCloudTransform
): [number, number, number, number] | null {
  const corners: [number, number][] = [
    [extent[0], extent[1]],
    [extent[0], extent[3]],
    [extent[2], extent[1]],
    [extent[2], extent[3]],
  ];

  const transformed = corners.map((corner) => transformCoordinate(corner));
  if (
    transformed.some(([x, y]) => !Number.isFinite(x) || !Number.isFinite(y))
  ) {
    return null;
  }

  const xs = transformed.map(([x]) => x);
  const ys = transformed.map(([, y]) => y);
  return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)];
}

function computeNodeBudgets(
  selectedNodes: HierarchyNodeEntry[],
  pointBudget: number
) {
  const totalPointCount = selectedNodes.reduce(
    (sum, entry) => sum + entry.node.pointCount,
    0
  );
  let remainingBudget = pointBudget;

  return selectedNodes.map((entry, index) => {
    const nodesLeft = selectedNodes.length - index;
    const reservedForRemaining = Math.max(0, nodesLeft - 1) * 128;
    const proportional = totalPointCount
      ? Math.round((pointBudget * entry.node.pointCount) / totalPointCount)
      : 128;
    const maxBudget = Math.max(1, remainingBudget - reservedForRemaining);
    const nodeBudget = Math.min(
      entry.node.pointCount,
      Math.max(128, Math.min(proportional, maxBudget))
    );
    remainingBudget -= nodeBudget;
    return nodeBudget;
  });
}

function isPointWithinExtent(
  x: number,
  y: number,
  extent: [number, number, number, number]
) {
  return x >= extent[0] && x <= extent[2] && y >= extent[1] && y <= extent[3];
}

function createRangeGetter(src: string, signal: AbortSignal) {
  let requestCount = 0;

  return async (begin: number, end: number) => {
    requestCount += 1;
    const response = await fetch(src, {
      method: "GET",
      headers: {
        Range: `bytes=${begin}-${end - 1}`,
      },
      signal,
    });

    logInfo("range response", {
      requestCount,
      src,
      begin,
      end,
      status: response.status,
      contentLength: response.headers.get("Content-Length"),
      contentRange: response.headers.get("Content-Range"),
    });

    if (response.status !== 200 && response.status !== 206) {
      throw new Error(
        `Unable to load point cloud range. Status: ${response.status}`
      );
    }

    return new Uint8Array(await response.arrayBuffer());
  };
}

function getLazPerf() {
  if (!lazPerfPromise) {
    logInfo("initializing laz-perf", {
      wasmUrl: lazPerfWasmUrl,
    });
    lazPerfPromise = createLazPerf({
      locateFile: (path: string) => {
        if (path.endsWith(".wasm")) {
          return lazPerfWasmUrl;
        }

        return path;
      },
    });
  }

  return lazPerfPromise;
}

async function collectHierarchyNodes(
  getter: RangeGetter,
  copc: Awaited<ReturnType<typeof Copc.create>>
) {
  const queue = [copc.info.rootHierarchyPage];
  const nodes: HierarchyNodeEntry[] = [];
  let pagesLoaded = 0;

  while (queue.length && pagesLoaded < PAGE_LOAD_LIMIT) {
    const page = queue.shift();
    if (!page) {
      break;
    }

    const subtree = await Copc.loadHierarchyPage(getter, page);
    pagesLoaded += 1;

    for (const [key, node] of Object.entries(subtree.nodes)) {
      if (!node || node.pointCount <= 0) {
        continue;
      }

      nodes.push(
        buildHierarchyNodeEntry(copc.info.cube, copc.info.spacing, key, node)
      );
    }

    for (const page of Object.values(subtree.pages)) {
      if (page) {
        queue.push(page);
      }
    }
  }

  return nodes.slice(0, HIERARCHY_NODE_CACHE_LIMIT);
}

function makeRawPointLoader(
  copc: Awaited<ReturnType<typeof Copc.create>>,
  getter: RangeGetter,
  style: PointCloudStyleConfig,
  transformCoordinate: (coordinate: [number, number]) => [number, number],
  sourceExtent: [number, number, number, number],
  hasRgb: boolean,
  hasIntensity: boolean,
  hasClassification: boolean,
  hasReturns: boolean
) {
  return async (entry: HierarchyNodeEntry, budget: number) => {
    const lazPerf = await getLazPerf();
    const include = ["X", "Y", "Z"];
    if (
      hasIntensity ||
      style.mode === "intensity" ||
      style.intensity_modulation
    ) {
      include.push("Intensity");
    }
    if (hasClassification || style.mode === "classification") {
      include.push("Classification");
    }
    if (hasReturns || style.mode === "return_number") {
      include.push("ReturnNumber");
    }
    if (hasRgb || style.mode === "rgb") {
      include.push("Red", "Green", "Blue");
    }

    const view = await Copc.loadPointDataView(getter, copc, entry.node, {
      include,
      lazPerf,
    });
    const pointCount = Math.min(view.pointCount, Math.max(1, budget));
    const step = Math.max(1, Math.ceil(view.pointCount / pointCount));

    const getX = view.getter("X");
    const getY = view.getter("Y");
    const getZ = view.getter("Z");
    const getIntensity = include.includes("Intensity")
      ? view.getter("Intensity")
      : null;
    const getClassification = include.includes("Classification")
      ? view.getter("Classification")
      : null;
    const getReturnNumber = include.includes("ReturnNumber")
      ? view.getter("ReturnNumber")
      : null;
    const getRed = include.includes("Red") ? view.getter("Red") : null;
    const getGreen = include.includes("Green") ? view.getter("Green") : null;
    const getBlue = include.includes("Blue") ? view.getter("Blue") : null;

    const points: RawPoint[] = [];
    for (
      let index = 0;
      index < view.pointCount && points.length < budget;
      index += step
    ) {
      const sourceX = getX(index);
      const sourceY = getY(index);
      if (!isPointWithinExtent(sourceX, sourceY, sourceExtent)) {
        continue;
      }

      const [x, y] = transformCoordinate([sourceX, sourceY]);
      points.push({
        x,
        y,
        z: getZ(index),
        intensity: getIntensity ? getIntensity(index) : null,
        classification: getClassification ? getClassification(index) : null,
        returnNumber: getReturnNumber ? getReturnNumber(index) : null,
        rgb:
          getRed && getGreen && getBlue
            ? [getRed(index), getGreen(index), getBlue(index)]
            : null,
      });
    }

    return points;
  };
}

class PointCloudLayer extends CoreLayer<
  VectorSource,
  WebGLPointsLayer<VectorSource>,
  VectorSourceOptions
> {
  private readonly item: LayerItemConfig;
  private readonly targetProjection: string;
  private readonly mapStore: MapStore | null;
  private readonly hmuxRequested: boolean;
  private abortController: AbortController | null = null;
  private bootstrapState: BootstrapState | null = null;
  private loadedViewSignature: string | null = null;
  private refreshTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly viewListenerKeys: EventsKey[] = [];

  constructor(
    item: LayerItemConfig,
    options?: CreateDisplayAdapterLayerOptions
  ) {
    super(
      item.id !== undefined ? String(item.id) : `point-cloud-${item.styleId}`,
      {
        title: item.title,
        visible: item.visibility,
        opacity: item.transparency ? 1 - item.transparency / 100 : 1,
      },
      {}
    );
    this.item = item;
    this.targetProjection = options?.mapProjection ?? "EPSG:3857";
    this.mapStore = options?.mapStore ?? null;
    this.hmuxRequested = !!options?.hmux;
    this.bindMapViewListeners();
    void this.initialize();
  }

  override setSymbols() {
    // Point cloud rendering does not support legend symbol intervals.
    // Ignore tree symbol toggles so they do not detach the source.
  }

  protected createSource(options: VectorSourceOptions) {
    return new VectorSource(options);
  }

  protected createLayer(options: LayerOptions & { source: VectorSource }) {
    return new WebGLPointsLayer({
      source: options.source,
      style: createWebGLPointStyle(),
      variables: {
        pointSize: DEBUG_MIN_POINT_SIZE,
        pointOpacity: DEBUG_MIN_OPACITY,
      },
      visible: options.visible,
      opacity: options.opacity,
      zIndex: DEBUG_Z_INDEX,
      disableHitDetection: true,
      minResolution: options.minResolution,
      maxResolution: options.maxResolution,
    });
  }

  override reload() {
    this.clearScheduledRefresh();
    this.bootstrapState = null;
    this.loadedViewSignature = null;
    void this.initialize();
  }

  override dispose() {
    this.abortController?.abort();
    this.abortController = null;
    this.clearScheduledRefresh();
    this.viewListenerKeys.forEach(unByKey);
    super.dispose();
  }

  private bindMapViewListeners() {
    if (!this.mapStore) {
      return;
    }

    this.viewListenerKeys.push(
      this.mapStore.olView.on("change:resolution", () => {
        this.scheduleViewRefresh("resolution");
      }),
      this.mapStore.olMap.on("moveend", () => {
        this.scheduleViewRefresh("moveend", 0);
      })
    );
  }

  private clearScheduledRefresh() {
    if (this.refreshTimer !== null) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private scheduleViewRefresh(
    reason: "resolution" | "moveend",
    delay = VIEW_REFRESH_DEBOUNCE_MS
  ) {
    this.clearScheduledRefresh();
    this.refreshTimer = setTimeout(() => {
      this.refreshTimer = null;
      void this.refreshForView(reason);
    }, delay);
  }

  private beginRequest() {
    this.abortController?.abort();
    const abortController = new AbortController();
    this.abortController = abortController;
    return abortController;
  }

  private getCurrentViewState(bootstrap: BootstrapState): PointCloudViewState {
    const dataExtent = buildPointCloudSourceExtent(bootstrap.pointCloud);
    const sizeRaw = this.mapStore?.olMap.getSize();
    const size: [number, number] =
      sizeRaw && sizeRaw.length === 2
        ? [Math.max(sizeRaw[0], 1), Math.max(sizeRaw[1], 1)]
        : DEFAULT_MAP_SIZE;

    if (!this.mapStore) {
      return {
        extent: dataExtent,
        resolution: Math.max(
          (dataExtent[2] - dataExtent[0]) / size[0],
          (dataExtent[3] - dataExtent[1]) / size[1]
        ),
        size,
      };
    }

    const mapExtent = this.mapStore.getExtent() as [
      number,
      number,
      number,
      number,
    ];
    const transformedExtent =
      transformExtentWith(mapExtent, bootstrap.inverseTransformCoordinate) ??
      dataExtent;
    const viewExtent =
      intersectExtents(transformedExtent, dataExtent) ?? transformedExtent;
    const resolution = Math.max(
      Math.max(viewExtent[2] - viewExtent[0], 1) / size[0],
      Math.max(viewExtent[3] - viewExtent[1], 1) / size[1]
    );

    return {
      extent: viewExtent,
      resolution,
      size,
    };
  }

  private async initialize() {
    const abortController = this.beginRequest();
    const { signal } = abortController;

    try {
      logInfo("initializing layer", {
        styleId: this.item.styleId,
        title: this.item.title,
        visibility: this.item.visibility,
        transparency: this.item.transparency,
      });

      if (this.hmuxRequested) {
        logInfo("hmux bypassed for point cloud", {
          reason: "Range headers are required for COPC requests.",
        });
      }

      const styleItem = (await route("resource.item", this.item.styleId).get({
        cache: false,
        signal,
      })) as PointCloudStyleResourceItem;

      const parentId = styleItem.resource.parent?.id;
      const styleConfig = styleItem.point_cloud_style?.value;
      if (!parentId || !styleConfig) {
        throw new Error("Point cloud style metadata is incomplete.");
      }

      logInfo("style loaded", {
        styleId: styleItem.resource.id,
        parentId,
        styleConfig: {
          mode: styleConfig.mode,
          point_size: styleConfig.point_size,
          opacity: styleConfig.opacity,
          use_percentile_clip: styleConfig.use_percentile_clip,
          elevation_min_percent: styleConfig.elevation_min_percent,
          elevation_max_percent: styleConfig.elevation_max_percent,
          intensity_modulation: styleConfig.intensity_modulation,
          classification_colors_count: styleConfig.classification_colors.length,
          ramp_start_color: styleConfig.ramp_start_color,
          ramp_end_color: styleConfig.ramp_end_color,
        },
      });

      const pointCloudItem = (await route("resource.item", parentId).get({
        cache: false,
        signal,
      })) as PointCloudResourceItem;
      const pointCloud = pointCloudItem.point_cloud;
      if (!pointCloud) {
        throw new Error("Point cloud resource metadata is missing.");
      }

      const {
        sourceProjection,
        projectionSource,
        transform,
        inverseTransform,
      } = createPointCloudCoordinateTransform(
        pointCloud,
        this.targetProjection
      );
      const sourceUrl = buildPointCloudSourceUrl(
        parentId,
        pointCloud.external_url
      );

      logInfo("point cloud loaded", {
        resourceId: pointCloudItem.resource.id,
        sourceUrl,
        sourceProjection,
        projectionSource,
        targetProjection: this.targetProjection,
        pointCloud,
      });

      const transformCoordinate =
        transform ??
        ((coordinate: [number, number]) => {
          const [x, y] = getTransform(
            sourceProjection,
            this.targetProjection
          )(coordinate);
          return [x, y] as [number, number];
        });
      const inverseTransformCoordinate =
        inverseTransform ??
        ((coordinate: [number, number]) => {
          const [x, y] = getTransform(
            this.targetProjection,
            sourceProjection
          )(coordinate);
          return [x, y] as [number, number];
        });

      const getter = createRangeGetter(sourceUrl, signal);
      const copc = await Copc.create(getter);
      logInfo("copc created", {
        header: {
          pointDataRecordFormat: copc.header.pointDataRecordFormat,
          pointDataRecordLength: copc.header.pointDataRecordLength,
          min: copc.header.min,
          max: copc.header.max,
        },
        info: copc.info,
        hasWkt: !!copc.wkt,
      });

      const hierarchyNodes = await collectHierarchyNodes(getter, copc);
      logInfo("hierarchy nodes collected", {
        count: hierarchyNodes.length,
        nodes: hierarchyNodes.slice(0, 10).map((entry) => ({
          key: entry.key,
          level: entry.level,
          pointCount: entry.node.pointCount,
          pointDataOffset: entry.node.pointDataOffset,
          pointDataLength: entry.node.pointDataLength,
        })),
      });

      this.bootstrapState = {
        parentId,
        sourceUrl,
        sourceProjection,
        projectionSource,
        pointCloud,
        styleConfig,
        copc,
        hierarchyNodes,
        transformCoordinate,
        inverseTransformCoordinate,
      };
      this.loadedViewSignature = null;

      await this.refreshBootstrapView(
        this.bootstrapState,
        signal,
        "initialize",
        true
      );
    } catch (error) {
      if (!signal.aborted) {
        console.error(LOG_PREFIX, "Point cloud layer initialization failed", {
          styleId: this.item.styleId,
          title: this.item.title,
          error,
        });
      }
    }
  }

  private async refreshForView(reason: "resolution" | "moveend") {
    const bootstrap = this.bootstrapState;
    if (!bootstrap) {
      return;
    }

    const abortController = this.beginRequest();
    try {
      await this.refreshBootstrapView(
        bootstrap,
        abortController.signal,
        reason,
        false
      );
    } catch (error) {
      if (
        abortController.signal.aborted ||
        isAbortError(error) ||
        (error instanceof DOMException && error.name === "AbortError")
      ) {
        logInfo("view refresh aborted", { reason });
        return;
      }

      console.error(LOG_PREFIX, "Point cloud view refresh failed", {
        styleId: this.item.styleId,
        title: this.item.title,
        reason,
        error,
      });
    }
  }

  private async refreshBootstrapView(
    bootstrap: BootstrapState,
    signal: AbortSignal,
    reason: string,
    force: boolean
  ) {
    const viewState = this.getCurrentViewState(bootstrap);
    const selection = selectHierarchyNodesForView(
      bootstrap.hierarchyNodes,
      viewState.extent,
      viewState.size,
      POINT_BUDGET
    );

    if (!force && selection.signature === this.loadedViewSignature) {
      logInfo("view refresh skipped", {
        reason,
        signature: selection.signature,
        targetLevel: selection.targetLevel,
      });
      return;
    }

    logInfo("view refresh", {
      reason,
      force,
      viewState: {
        extent: viewState.extent.map((value) => roundNumber(value)),
        resolution: roundNumber(viewState.resolution, 6),
        size: viewState.size,
      },
      targetLevel: selection.targetLevel,
      sourceResolution: roundNumber(selection.sourceResolution, 6),
      selectedNodeCount: selection.selectedNodes.length,
      selectedNodeKeys: selection.selectedNodes
        .slice(0, 12)
        .map((entry) => entry.key),
    });

    if (!selection.selectedNodes.length) {
      this.olSource.clear(true);
      this.loadedViewSignature = selection.signature;
      return;
    }

    const getter = createRangeGetter(bootstrap.sourceUrl, signal);
    const loadRawPoints = makeRawPointLoader(
      bootstrap.copc,
      getter,
      bootstrap.styleConfig,
      bootstrap.transformCoordinate,
      viewState.extent,
      bootstrap.pointCloud.has_rgb,
      bootstrap.pointCloud.has_intensity,
      bootstrap.pointCloud.has_classification,
      bootstrap.pointCloud.has_returns
    );

    const rawPoints: RawPoint[] = [];
    const nodeBudgets = computeNodeBudgets(
      selection.selectedNodes,
      POINT_BUDGET
    );

    for (const [index, entry] of selection.selectedNodes.entries()) {
      if (rawPoints.length >= POINT_BUDGET || signal.aborted) {
        break;
      }

      const nodePoints = await loadRawPoints(
        entry,
        Math.min(POINT_BUDGET - rawPoints.length, nodeBudgets[index])
      );
      rawPoints.push(...nodePoints);

      logInfo("node points loaded", {
        key: entry.key,
        level: entry.level,
        spacing: roundNumber(entry.spacing, 6),
        nodePointCount: entry.node.pointCount,
        loadedPointCount: nodePoints.length,
        accumulatedPointCount: rawPoints.length,
      });
    }

    if (signal.aborted) {
      return;
    }

    const rawPointsSummary = summarizePoints(rawPoints);
    logInfo("raw points prepared", rawPointsSummary);
    logInfo("raw points prepared json", JSON.stringify(rawPointsSummary));

    const colors = createFeatureColors(rawPoints, bootstrap.styleConfig, {
      zmin: bootstrap.pointCloud.zmin,
      zmax: bootstrap.pointCloud.zmax,
    });
    logInfo("feature colors prepared", {
      count: colors.length,
      sample: colors.slice(0, 5),
    });

    const features = rawPoints.map((point, index) => {
      const [colorR, colorG, colorB] = colorAsArray(colors[index]);
      return new Feature({
        geometry: new Point([point.x, point.y]),
        color: colors[index],
        colorR,
        colorG,
        colorB,
      });
    });

    this.olSource.clear(true);
    this.olSource.addFeatures(features);
    this.olLayer.updateStyleVariables(
      getWebGLStyleVariables(bootstrap.styleConfig)
    );
    this.olSource.changed();
    this.loadedViewSignature = selection.signature;

    const sourceExtent = this.olSource.getExtent();
    const featureSummary = {
      featureCount: features.length,
      sourceFeatureCount: this.olSource.getFeatures().length,
      sourceExtent: sourceExtent
        ? sourceExtent.map((value) => roundNumber(value))
        : null,
      styleVariables: getPointCloudLayerStyleVariables(bootstrap.styleConfig),
      debugPointRadius: getWebGLStyleVariables(bootstrap.styleConfig).pointSize,
      debugPointOpacity: getWebGLStyleVariables(bootstrap.styleConfig)
        .pointOpacity,
      debugLayerZIndex: DEBUG_Z_INDEX,
      viewSignature: this.loadedViewSignature,
    };

    logInfo("features added to source", featureSummary);
    logInfo("features added to source json", JSON.stringify(featureSummary));
  }
}

export function createPointCloudLayer(
  item: LayerItemConfig,
  options?: CreateDisplayAdapterLayerOptions
) {
  return new PointCloudLayer(item, options);
}
