import {
  action,
  actionBound,
  computed,
  observable,
  observableRef,
  observableStruct,
  runInAction,
} from "mobx";
import type { Feature } from "ol";
import type OlMap from "ol/Map";
import type { MapOptions as OlMapOptions } from "ol/Map";
import type View from "ol/View";
import type { FitOptions } from "ol/View";
import * as olExtent from "ol/extent";
import type { Extent } from "ol/extent";
import { GeoJSON, WKT } from "ol/format";
import type { Geometry } from "ol/geom";
import * as olProj from "ol/proj";
import type { ProjectionLike } from "ol/proj";

import type { NgwExtent } from "@nextgisweb/feature-layer/type/api";

import type { TargetPosition } from "../control-container/ControlContainer";
import type { LayerDefinition, TileLayerOptions } from "../layer-adapter";
import type { CoreLayer } from "../layer-adapter/CoreLayer";
import {
  DEFAULT_MAP_MAX_ZOOM,
  DEFAULT_MAP_PROJECTION,
} from "../map-adapter/constant";
import { registry as adapterRegistry } from "../map-adapter/registry";
import type { MapAdapterPlugin } from "../map-adapter/registry";
import type {
  MapAdapter,
  MapExtent,
  MapViewOptions,
  MapViewState,
} from "../map-adapter/type";

import { OpenLayersMapAdapter } from "./OlMapAdapter";
import { PanelControl } from "./panel-control/PanelControl";
import type { ControlOptions } from "./panel-control/PanelControl";
import { scaleForResolution } from "./util/resolutionUtil";

interface MapOptions extends Omit<OlMapOptions, "target"> {
  hmux?: boolean;
  logo?: boolean;
  target?: HTMLElement;
  mapMode?: string;
  initialView?: MapViewOptions;
  measureSrsId?: number | null;
  initialExtent?: Extent;
  lonlatProjection?: string;
  displayProjection?: string;
  constrainingExtent?: Extent;
  canChangeMapMode?: () => boolean;
}

interface MapStartupOptions {
  onCreated?: () => void;
  onError?: (error: unknown) => void;
}

export interface Position {
  zoom: number;
  center: number[];
}

interface GeomOptions {
  srs?: string;
  format?: "wkt" | "geojson";
  fit?: FitOptions;
}

interface Layers {
  [key: string]: CoreLayer;
}

export const TOP_LAYER_ZINDEX = 10000;

export class MapStore {
  readonly panelControl = new PanelControl();

  private readonly DPI = 1000 / 39.37 / 0.28;
  private readonly IPM = 39.37;

  readonly initialExtent?: Extent;
  readonly constrainingExtent?: Extent;

  readonly maxZoom = DEFAULT_MAP_MAX_ZOOM;

  @observableRef accessor displayProjection = DEFAULT_MAP_PROJECTION;

  @computed
  get displaySrsId(): number {
    return Number(this.displayProjection.replace("EPSG:", ""));
  }
  readonly lonlatProjection = "EPSG:4326";

  @observableRef accessor hmux: boolean | null;

  /**
   * @deprecated TODO remove from MapStore after migrating the remaining consumers.
   */
  @observableRef accessor olMap: OlMap;
  /**
   * @deprecated TODO remove from MapStore after migrating the remaining consumers.
   */
  @observableRef accessor olView: View;

  /** The adapter is mounted and the map view has been initialized. */
  @observableRef accessor ready = false;
  @observableRef accessor started = false;

  @observableRef accessor layers: Layers = {};

  @observableRef accessor baseLayer: CoreLayer | null = null;
  @observableRef accessor basemapConfigs: TileLayerOptions[] = [];
  @observableRef accessor activeBasemapKey = "blank";
  private basemapSelectionInitialized = false;
  private readonly layerDefinitions = observable.set<LayerDefinition>([], {
    deep: false,
  });
  private readonly adapterPlugins = new WeakMap<MapAdapter, MapAdapterPlugin>();
  private readonly layerOwners = new WeakMap<CoreLayer, MapAdapter>();
  @observableRef accessor resolution: number | null = null;
  @observableStruct accessor center: number[] | null = null;
  @observableRef accessor zoom: number | null = null;
  @observableRef accessor measureSrsId: number | null = null;
  @observableStruct accessor position: Position | null = null;
  @observableRef accessor rotation: number = 0;

  @observableRef accessor mapState: string | null = null;
  @observableRef accessor isLoading: boolean = false;
  @observableRef accessor defaultMapState: string | null = null;

  /**
   * @deprecated TODO remove from MapStore after migrating the remaining consumers.
   */
  readonly defaultAdapter: OpenLayersMapAdapter;

  @observableRef accessor mapMode = "2d";
  @observableRef accessor adapter: MapAdapter;
  private adapterUnsubscribe?: () => void;
  private target?: HTMLElement;
  private startupOptions?: MapStartupOptions;
  private transitionId = 0;
  private viewInitialized = false;
  @observableRef private accessor mapModeChangeAllowed = true;
  private loadingStartTime?: number;
  @observableRef private accessor targetElementValue: HTMLElement | null = null;

  constructor(private options: MapOptions) {
    const {
      hmux,
      target,
      mapMode = "2d",
      initialView,
      measureSrsId,
      initialExtent,
      constrainingExtent,
      canChangeMapMode,
      ...viewOptions
    } = this.options;
    this.hmux = hmux ?? null;
    this.measureSrsId = measureSrsId ?? null;
    this.initialExtent = initialExtent;
    this.constrainingExtent = constrainingExtent;
    this.defaultAdapter = new OpenLayersMapAdapter({
      ...viewOptions,
      constrainingExtent,
    });
    this.adapter = this.defaultAdapter;
    this.olMap = this.defaultAdapter.map;
    this.olView = this.olMap.getView();
    this.displayProjection =
      options.displayProjection ?? this.olView.getProjection().getCode();
    if (
      mapMode === "2d" ||
      adapterRegistry.queryAll().some(({ key }) => key === mapMode)
    ) {
      this.mapMode = mapMode;
    }
    this.subscribeToAdapter();
    if (target) {
      this.startup(target);
    }
  }

  @computed
  private get adapterPlugin(): MapAdapterPlugin | undefined {
    return adapterRegistry.queryAll().find(({ key }) => key === this.mapMode);
  }

  @computed
  get canChangeMapMode(): boolean {
    return (
      this.mapModeChangeAllowed && (this.options.canChangeMapMode?.() ?? true)
    );
  }

  @actionBound
  setMapModeOptions({
    allowMapModeChange = true,
  }: {
    allowMapModeChange?: boolean;
  }): void {
    this.mapModeChangeAllowed = allowMapModeChange;
  }

  @actionBound
  setMapMode(mode: string): boolean {
    if (mode === this.mapMode || !this.canChangeMapMode) return false;
    if (
      mode !== "2d" &&
      !adapterRegistry.queryAll().some(({ key }) => key === mode)
    ) {
      return false;
    }
    this.mapMode = mode;
    if (this.target) void this.mountAdapter();
    return true;
  }

  @actionBound
  private setAdapter(adapter: MapAdapter, plugin?: MapAdapterPlugin): void {
    if (adapter === this.adapter) return;
    if (plugin) this.adapterPlugins.set(adapter, plugin);
    this.adapterUnsubscribe?.();
    this.adapterUnsubscribe = undefined;
    this.loadingStartTime = undefined;
    this.adapter = adapter;
  }

  getViewState(): MapViewState | null {
    const state = this.adapter.getViewState();
    if (state) return state;
    const { center, zoom, resolution, rotation } = this;
    if (!center || zoom === null || resolution === null) return null;
    return { center: [...center], zoom, resolution, rotation };
  }

  private subscribeToAdapter(): void {
    this.adapterUnsubscribe?.();
    const adapter = this.adapter;
    const unsubscribe = adapter.subscribe(() => {
      if (adapter === this.adapter) {
        this.syncAdapterState();
      }
    });
    const unsubscribeMoveEnd = adapter.subscribeMoveEnd(() => {
      if (adapter === this.adapter) {
        this.syncPosition();
      }
    });
    this.adapterUnsubscribe = () => {
      unsubscribe();
      unsubscribeMoveEnd();
    };
    this.syncAdapterState();
  }

  @action
  private syncAdapterState(): void {
    const state = this.adapter.getViewState();
    if (state) {
      this.center = state.center;
      this.zoom = state.zoom;
      this.resolution = state.resolution;
      this.rotation = state.rotation;
    }
    const status = this.adapter.getStatus();
    if (state && status.started && this.position === null) {
      this.position = { center: state.center, zoom: state.zoom };
    }
    if (!status.started) {
      this.loadingStartTime = undefined;
    } else if (status.isLoading) {
      this.loadingStartTime ??= performance.now();
    } else if (this.loadingStartTime !== undefined) {
      const durationMs = (performance.now() - this.loadingStartTime).toFixed(0);
      console.log(`Map layers loaded in ${durationMs} ms`);
      this.loadingStartTime = undefined;
    }
    this.started = status.started;
    this.isLoading = status.isLoading;
    this.targetElementValue = status.target;
  }

  @action
  private syncPosition(): void {
    const state = this.adapter.getViewState();
    if (state) this.position = { center: state.center, zoom: state.zoom };
  }

  @action
  setViewState(state: MapViewState): void {
    this.adapter.setViewState(state);
    this.syncPosition();
  }

  @action
  setViewOptions(options: MapViewOptions): void {
    const { extent, ...view } = options;
    this.adapter.setViewOptions(view);
    if (extent) {
      this.fitNGWExtent(extent);
    }
    this.syncPosition();
  }

  setPosition({ center, zoom }: Position): void {
    const state = this.getViewState();
    if (!state) return;
    this.setViewState({
      ...state,
      center,
      zoom,
      resolution: state.resolution * 2 ** (state.zoom - zoom),
    });
  }

  canZoomBy(delta: number): boolean {
    if (this.zoom === null) return false;
    return this.adapter.canZoomBy(delta);
  }

  zoomBy(delta: number, duration?: number): void {
    this.adapter.zoomBy(delta, duration);
  }

  setRotation(rotation: number, duration?: number): void {
    this.adapter.setRotation(rotation, duration);
  }

  @actionBound
  setBasemapConfigs(configs: TileLayerOptions[], preferredKey?: string): void {
    this.basemapConfigs = configs.map((config, index) => ({
      ...config,
      name: config.name ?? `basemap_${index}`,
    }));
    if (!configs.length) return;
    const hasKey = (key?: string) =>
      key !== undefined && this.basemapConfigs.some((c) => c.name === key);
    if (this.basemapSelectionInitialized && hasKey(this.activeBasemapKey))
      return;
    this.activeBasemapKey =
      (hasKey(preferredKey) ? preferredKey : undefined) ??
      this.basemapConfigs.find((c) => c.layer?.visible)?.name ??
      (hasKey("blank") ? "blank" : this.basemapConfigs[0].name!);
    this.basemapSelectionInitialized = true;
  }

  @actionBound
  setMapState(val: string | null) {
    this.mapState = val;
  }
  @actionBound
  deactivateMapState(val: string) {
    if (this.mapState === val) {
      this.mapState = null;
    }
  }

  @actionBound
  setDefaultMapState(val: string | null) {
    this.defaultMapState = val;
  }

  @action
  setBaseLayer(layer: CoreLayer) {
    this.baseLayer = layer;
    this.activeBasemapKey = layer.name;
    this.basemapSelectionInitialized = true;
  }

  @actionBound
  setMeasureSrsId(measureSrsId: number | null | undefined) {
    this.measureSrsId = measureSrsId ?? null;
  }

  @action
  setIsLoading(val: boolean) {
    this.isLoading = val;
  }

  @actionBound
  switchBasemap(basemapLayerKey: string) {
    if (!this.basemapConfigs.some((c) => c.name === basemapLayerKey))
      return false;
    this.activeBasemapKey = basemapLayerKey;
    this.basemapSelectionInitialized = true;
    return true;
  }

  async startup(
    target: HTMLElement,
    options?: MapStartupOptions
  ): Promise<void> {
    this.target = target;
    this.startupOptions = options;
    await this.mountAdapter();
  }

  private async mountAdapter(state = this.getViewState()): Promise<void> {
    const target = this.target;
    if (!target) return;
    const transitionId = ++this.transitionId;
    const mode = this.mapMode;
    const plugin = this.adapterPlugin;
    this.unmountAdapter();
    let created: MapAdapter | undefined;

    try {
      created = plugin
        ? await plugin.createAdapter({ mapStore: this })
        : this.defaultAdapter;
      if (transitionId !== this.transitionId) {
        if (created !== this.defaultAdapter && created !== this.adapter) {
          created.unmount();
        }
        return;
      }
      this.setAdapter(created, plugin);
      this.subscribeToAdapter();
      await created.mount(target);
      if (transitionId !== this.transitionId) {
        if (created !== this.adapter || !this.target) {
          created.unmount();
        }
        return;
      }
      if (state) {
        this.setViewState(state);
      } else if (!this.viewInitialized) {
        if (this.options.initialView) {
          this.setViewOptions(this.options.initialView);
        } else {
          this.zoomToInitialExtent();
          this.syncPosition();
        }
      }
      this.viewInitialized = true;
      runInAction(() => {
        this.ready = true;
      });
      this.startupOptions?.onCreated?.();
    } catch (error) {
      if (transitionId !== this.transitionId) return;
      runInAction(() => {
        this.ready = false;
      });
      if (this.startupOptions?.onError) {
        this.startupOptions.onError(error);
      } else console.error(error);
      if (mode !== "2d") {
        this.restoreDefaultAdapter(state);
      }
    }
  }

  @action
  private restoreDefaultAdapter(state?: MapViewState | null): void {
    this.mapMode = "2d";
    if (this.target) void this.mountAdapter(state);
  }

  detach(): void {
    ++this.transitionId;
    this.target = undefined;
    this.startupOptions = undefined;
    this.unmountAdapter();
  }

  @action
  private unmountAdapter(): void {
    this.ready = false;
    this.syncAdapterState();
    this.adapterUnsubscribe?.();
    this.adapterUnsubscribe = undefined;
    this.adapter.unmount();
    this.syncAdapterState();
  }

  @actionBound
  registerLayerDefinition(layerDefinition: LayerDefinition): () => void {
    this.layerDefinitions.add(layerDefinition);
    return action(() => {
      this.layerDefinitions.delete(layerDefinition);
    });
  }

  private isLayerSupported(
    layerDefinition: LayerDefinition,
    plugin?: MapAdapterPlugin
  ): boolean {
    if (!plugin) return true;
    const { layerSupport } = plugin;
    switch (layerDefinition.type) {
      case "tile":
        return layerSupport.tile?.(layerDefinition.options) ?? false;
      case "webmap":
        return (
          layerSupport.webmap?.(
            layerDefinition.item,
            layerDefinition.options
          ) ?? false
        );
      case "geojson":
        return layerSupport.geojson?.(layerDefinition.options) ?? false;
      case "resource":
        return (
          layerSupport.resource?.[layerDefinition.resourceType]?.(
            layerDefinition.options
          ) ?? false
        );
    }
  }

  canUseMapAdapter(mode: string): boolean {
    const plugin = adapterRegistry.queryAll().find(({ key }) => key === mode);
    if (mode !== "2d" && !plugin) return false;
    for (const layerDefinition of this.layerDefinitions) {
      if (!this.isLayerSupported(layerDefinition, plugin)) return false;
    }
    return true;
  }

  createLayer(
    layerDefinition: LayerDefinition,
    adapter: MapAdapter = this.adapter
  ): CoreLayer | undefined | Promise<CoreLayer | undefined> {
    if (
      !this.isLayerSupported(layerDefinition, this.adapterPlugins.get(adapter))
    )
      return;
    const factories = adapter.layerAdapters;
    switch (layerDefinition.type) {
      case "tile":
        return factories.tile(layerDefinition.options);
      case "webmap":
        return factories.webmap(layerDefinition.item, layerDefinition.options);
      case "geojson":
        return factories.geojson(layerDefinition.options);
      case "resource":
        return factories.resource?.[layerDefinition.resourceType]?.(
          layerDefinition.options
        );
    }
  }

  getLayer(id: number): CoreLayer | undefined {
    return this.layers[id];
  }

  @action
  addLayer(layer: CoreLayer, order?: number, adapter?: MapAdapter): void {
    const owner = this.layerOwners.get(layer) ?? adapter ?? this.adapter;
    this.layerOwners.set(layer, owner);
    if (layer.isBaseLayer) {
      layer.setZIndex(-1);
    } else if (layer.isTopLayer) {
      layer.setZIndex(TOP_LAYER_ZINDEX);
    } else if (order !== undefined) {
      layer.setZIndex(order);
    }
    owner.addLayer(layer);
    if (layer.isBaseLayer && layer.name === this.activeBasemapKey) {
      this.baseLayer = layer;
    }
    this.layers = { ...this.layers, [layer.name]: layer };
  }

  @actionBound
  setLayerZIndex(layerDef: CoreLayer | number, zIndex: number) {
    const layer =
      typeof layerDef === "number" ? this.layers[layerDef] : layerDef;
    layer?.setZIndex(zIndex);
  }

  @computed
  get baseLayers(): Layers {
    const layers: Layers = {};
    for (const [key, layer] of Object.entries(this.layers)) {
      if (!layer.isBaseLayer) continue;
      layers[key] = layer;
    }
    return layers;
  }

  @actionBound
  removeLayer(layer: CoreLayer, adapter?: MapAdapter): void {
    const owner = this.layerOwners.get(layer) ?? adapter ?? this.adapter;
    owner.removeLayer(layer);
    this.layerOwners.delete(layer);
    if (this.layers[layer.name] === layer) {
      const layers = { ...this.layers };
      delete layers[layer.name];
      this.layers = layers;
    }
    if (this.baseLayer === layer) {
      this.baseLayer = null;
    }
  }

  @computed
  get scale(): number | undefined {
    const resolution = this.resolution;

    if (resolution === null) return;

    return scaleForResolution({
      dpi: this.DPI,
      ipm: this.IPM,
      projection: olProj.get(this.displayProjection)!,
      resolution,
    });
  }

  resolutionForScale(scale: number | string): number | undefined {
    if (scale === null || scale === undefined) {
      return;
    }
    const mpu = olProj.get(this.displayProjection)?.getMetersPerUnit() ?? 1;
    scale = typeof scale === "string" ? parseFloat(scale) : scale;
    return scale / (mpu * this.DPI * this.IPM);
  }

  getPosition(crs?: string): Position {
    const state = this.adapter.getViewState();
    if (!state) {
      throw new Error("Map center is not set");
    }

    let center = state.center;
    const mapCrs = this.displayProjection;
    if (crs && crs !== mapCrs) {
      center = olProj.transform(center, mapCrs, crs);
    }

    return {
      zoom: state.zoom,
      center,
    };
  }

  getExtent(crs?: string): number[] {
    let extent = this.adapter.getExtent() ?? olExtent.createEmpty();
    const mapCrs = this.displayProjection;

    if (crs && crs !== mapCrs) {
      extent = olProj.transformExtent(extent, mapCrs, crs);
    }

    return extent;
  }

  fitNGWExtent(mapExtent: MapExtent) {
    const { extent, srs, ...fitOptions } = mapExtent;

    const bbox: number[] = [
      extent.minLon,
      extent.minLat,
      extent.maxLon,
      extent.maxLat,
    ];

    this.zoomToExtent(bbox, {
      ...fitOptions,
      ...(srs ? { projection: `EPSG:${srs.id}` } : {}),
    });
  }

  zoomToFeature(feature: Feature, options?: FitOptions): void {
    const geometry = feature.getGeometry();
    if (!geometry) {
      throw new Error("Feature has no geometry");
    }

    const extent = geometry.getExtent();
    this.zoomToExtent(extent, options);
  }

  private geomToExtent(
    geom: string | Geometry,
    opts: GeomOptions = { srs: "EPSG:3857", format: "wkt" }
  ): Extent {
    const dataProjection = opts.srs ?? "EPSG:3857";
    const viewProj = this.displayProjection;
    const isWkt = opts.format === "wkt";

    const geometry =
      typeof geom === "string"
        ? (isWkt ? new WKT() : new GeoJSON()).readGeometry(geom, {
            dataProjection,
            featureProjection: viewProj,
          })
        : geom;

    return geometry.getExtent();
  }

  zoomToGeom(geom: string | Geometry, opts?: GeomOptions): void {
    this.zoomToExtent(this.geomToExtent(geom, opts), opts?.fit);
  }

  panToGeom(geom: string | Geometry, opts?: GeomOptions): void {
    this.panToExtent(this.geomToExtent(geom, opts), opts?.fit);
  }

  panToExtent(extent: Extent, fitOpts?: FitOptions): void {
    const viewExtent = this.adapter.getExtent();

    if (viewExtent && olExtent.containsExtent(viewExtent, extent)) {
      return;
    }

    const state = this.adapter.getViewState();
    const [width, height] = olExtent.getSize(extent);
    const [viewWidth, viewHeight] = viewExtent
      ? olExtent.getSize(viewExtent)
      : [0, 0];
    const fitsInView = width <= viewWidth && height <= viewHeight;

    if (state && fitsInView) {
      this.setViewState({ ...state, center: olExtent.getCenter(extent) });
    } else {
      this.adapter.zoomToExtent(extent, { ...fitOpts, smartZoom: false });
    }
  }

  zoomToExtent(
    extent: number[],
    {
      projection,
      ...fitOpts
    }: FitOptions & { projection?: ProjectionLike } = {}
  ): void {
    if (projection) {
      extent = olProj.transformExtent(
        extent,
        projection,
        this.displayProjection
      );
    }
    this.adapter.zoomToExtent(extent, fitOpts);
  }

  zoomToInitialExtent() {
    if (this.initialExtent) {
      this.adapter.zoomToExtent(this.initialExtent, { smartZoom: false });
    }
  }

  zoomToNgwExtent(
    ngwExtent: NgwExtent,
    {
      displayProjection,
      ...options
    }: FitOptions & { displayProjection?: string } = {}
  ): void {
    const { minLon, minLat, maxLon, maxLat } = ngwExtent;
    if (
      minLon === null ||
      minLat === null ||
      maxLon === null ||
      maxLat === null
    ) {
      return;
    }

    const extent = olProj.transformExtent(
      [minLon, minLat, maxLon, maxLat],
      "EPSG:4326",
      displayProjection
    );

    this.zoomToExtent(extent, options);
  }

  getControlContainer(): HTMLElement {
    return this.panelControl.getContainer();
  }

  getControlTarget(element: HTMLElement): HTMLElement | undefined {
    return this.panelControl.getTarget(element);
  }

  addControl(options: ControlOptions): void {
    this.panelControl.addControl(options);
  }

  updateControlPlacement(
    element: HTMLElement,
    position: TargetPosition,
    order?: number
  ): void {
    this.panelControl.updateControlPlacement(element, position, order);
  }

  removeControl(element: HTMLElement): void {
    this.panelControl.removeControl(element);
  }

  @computed
  get targetElement(): HTMLElement | null {
    return this.targetElementValue;
  }

  @action
  updateSize() {
    this.adapter.resize();
  }
}
