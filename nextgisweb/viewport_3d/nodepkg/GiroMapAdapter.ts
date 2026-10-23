import { GlobeControls } from "@giro3d/giro3d/controls/GlobeControls.js";
import Instance from "@giro3d/giro3d/core/Instance.js";
import { CoordinateSystem } from "@giro3d/giro3d/core/geographic/CoordinateSystem.js";
import { Coordinates } from "@giro3d/giro3d/core/geographic/Coordinates.js";
import Globe from "@giro3d/giro3d/entities/Globe.js";
import { defaultMapSubdivisionStrategy } from "@giro3d/giro3d/entities/Map.js";
import { boundingExtent } from "ol/extent";
import { fromLonLat, get as getProjection, toLonLat } from "ol/proj";
import {
  Color,
  MathUtils,
  PerspectiveCamera,
  Raycaster,
  Vector2,
  Vector3,
} from "three";

import type { LayerAdapters } from "@nextgisweb/webmap/layer-adapter";
import { loadGeoJsonFeatures } from "@nextgisweb/webmap/layer-adapter/loadGeoJsonFeatures";
import type {
  MapAdapter,
  MapAdapterStatus,
  MapClickEvent,
  MapFitOptions,
  MapViewOptions,
  MapViewState,
} from "@nextgisweb/webmap/map-adapter";
import {
  DEFAULT_MAP_MIN_ZOOM,
  DEFAULT_MAP_PROJECTION,
  SMART_FIT_EXTENT_SIZE,
  SMART_FIT_MIN_ZOOM,
} from "@nextgisweb/webmap/map-adapter/constant";
import {
  WEB_MERCATOR_MAX_LATITUDE_DEGREES,
  WEB_MERCATOR_ZOOM_ZERO_RESOLUTION,
} from "@nextgisweb/webmap/utils/mercator";

import { GiroGeoJsonLayerAdapter } from "./GiroGeoJsonLayerAdapter";
import type { GiroLayerAdapter } from "./GiroLayerAdapter";
import { GiroWebmapLayerAdapter } from "./GiroWebmapLayerAdapter";
import { createTileLayer } from "./createTileLayer";

const ZOOM_EPSILON = 1e-7;

export class GiroMapAdapter implements MapAdapter<GiroLayerAdapter> {
  private instance: Instance | null = null;
  private map: Globe | null = null;
  private controls: GlobeControls | null = null;
  private mounting?: Promise<Globe>;
  private target: HTMLElement | null = null;
  private started = false;
  private isLoading = false;
  private minZoom = DEFAULT_MAP_MIN_ZOOM;
  private disposers: (() => void)[] = [];
  private readonly changeListeners = new Set<() => void>();
  private readonly moveEndListeners = new Set<() => void>();
  private readonly clickDisposers = new Set<() => void>();
  private readonly layers = new Set<GiroLayerAdapter>();
  private readonly pendingLayerAdds = new Set<Promise<void>>();

  readonly layerAdapters: LayerAdapters<GiroLayerAdapter> = {
    tile: (options) =>
      createTileLayer(this.getInstance(), options, () =>
        this.updateLayerOrder()
      ),
    webmap: (item) =>
      new GiroWebmapLayerAdapter(this.getInstance(), item, () =>
        this.updateLayerOrder()
      ),
    geojson: async (options) => {
      const instance = this.getInstance();
      const features = options.source
        ? await loadGeoJsonFeatures(options)
        : undefined;
      if (this.instance !== instance) return;
      const layer = new GiroGeoJsonLayerAdapter(instance, options, () =>
        this.updateLayerOrder()
      );
      if (features) layer.setFeatures(features);
      return layer;
    },
  };

  constructor(private readonly options: { maxZoom: number }) {}

  private notify = () => {
    for (const callback of this.changeListeners) callback();
  };

  private moveEnd = () => {
    this.notify();
    for (const callback of this.moveEndListeners) callback();
  };

  getStatus(): MapAdapterStatus {
    return {
      started: this.started,
      isLoading: this.isLoading,
      target: this.target,
    };
  }

  async mount(target: HTMLElement): Promise<void> {
    this.unmount();
    this.target = target;
    const instance = new Instance({
      target: target as HTMLDivElement,
      crs: CoordinateSystem.epsg4978,
      backgroundColor: "#ffffff",
    });
    this.instance = instance;
    const map = new Globe({
      lighting: false,
      backgroundColor: "#ffffff",
      subdivisionStrategy: defaultMapSubdivisionStrategy,
    });
    this.map = map;

    try {
      this.mounting = instance.add(map);
      await this.mounting;
      if (this.instance !== instance) return;
      this.mounting = undefined;
      instance.view.goTo(map);
      const controls = new GlobeControls({
        scene: map.object3d,
        ellipsoid: map.ellipsoid,
        camera: instance.view.camera,
        domElement: instance.domElement,
        enableDamping: false,
      });
      this.controls = controls;
      instance.view.setControls(controls);
      instance.view.addEventListener("change", this.notify);
      const finishMove = () => {
        // GlobeControls emits end before resetting its pointer state.
        queueMicrotask(() => {
          if (this.instance !== instance) return;
          controls.update();
          instance.notifyChange(map);
          this.moveEnd();
        });
      };
      controls.addEventListener("end", finishMove);
      const updateLoading = () => {
        if (this.isLoading !== instance.loading) {
          this.isLoading = instance.loading;
          this.notify();
        }
      };
      instance.addEventListener("update-end", updateLoading);
      this.disposers.push(
        () => instance.view.removeEventListener("change", this.notify),
        () => controls.removeEventListener("end", finishMove),
        () => instance.removeEventListener("update-end", updateLoading)
      );
      this.started = true;
      this.resize();
      updateLoading();
      this.notify();
    } catch (error) {
      if (this.instance === instance) {
        this.unmount();
      }
      throw error;
    }
  }

  unmount(): void {
    for (const dispose of this.clickDisposers) {
      dispose();
    }
    for (const dispose of this.disposers) {
      dispose();
    }
    this.disposers = [];
    const instance = this.instance;
    for (const layer of this.layers) {
      layer.detach();
    }
    this.layers.clear();
    const pending = [...this.pendingLayerAdds];
    this.pendingLayerAdds.clear();
    if (this.mounting) {
      pending.push(this.mounting.then(() => {}));
    }
    this.mounting = undefined;
    if (instance) {
      instance.view.setControls(null);
      this.controls?.dispose();
      instance.viewport.remove();
      // addLayer can still be initializing its source and GPU resources.
      void Promise.allSettled(pending).then(() => {
        instance.dispose();
        instance.renderer.forceContextLoss();
      });
    }
    this.instance = null;
    this.map = null;
    this.controls = null;
    this.target = null;
    this.started = false;
    this.isLoading = false;
    this.notify();
  }

  private getInstance(): Instance {
    if (!this.instance) throw new Error("Giro3D map is not mounted");
    return this.instance;
  }

  private getCamera(): PerspectiveCamera | undefined {
    const camera = this.instance?.view.camera;
    return camera instanceof PerspectiveCamera ? camera : undefined;
  }

  addLayer(layer: GiroLayerAdapter): void {
    if (!this.map) return;
    this.layers.add(layer);
    layer.attach(this.map);
    const ready = layer.whenReady;
    this.pendingLayerAdds.add(ready);
    void ready.then(
      () => this.pendingLayerAdds.delete(ready),
      () => this.pendingLayerAdds.delete(ready)
    );
    this.updateLayerOrder();
  }

  removeLayer(layer: GiroLayerAdapter): void {
    this.layers.delete(layer);
    layer.detach();
  }

  private updateLayerOrder(): void {
    if (!this.map) return;
    const layers = [...this.layers].sort(
      (a, b) =>
        Number(b.isBaseLayer) - Number(a.isBaseLayer) ||
        Number(a.isTopLayer) - Number(b.isTopLayer) ||
        a.zIndex - b.zIndex
    );
    this.map.sortColorLayers(
      (a, b) =>
        layers.findIndex((layer) => layer.layer === a) -
        layers.findIndex((layer) => layer.layer === b)
    );
    this.instance?.notifyChange(this.map);
  }

  private pickGround(pixel: number[]): Vector3 | null {
    const instance = this.instance;
    const camera = this.getCamera();
    if (!instance || !camera || !this.map) return null;
    const { width, height } = instance.view;
    if (!width || !height) return null;
    camera.updateMatrixWorld(true);
    const raycaster = new Raycaster();
    raycaster.setFromCamera(
      new Vector2((pixel[0] / width) * 2 - 1, 1 - (pixel[1] / height) * 2),
      camera
    );
    return this.map.ellipsoid.intersectRay(raycaster.ray);
  }

  private getCameraFocus(): Vector3 | null {
    const view = this.instance?.view;
    return view ? this.pickGround([view.width / 2, view.height / 2]) : null;
  }

  private mapCoordinate(point: Vector3): number[] {
    const position = new Coordinates(CoordinateSystem.epsg4978, point).as(
      CoordinateSystem.epsg4326
    );
    return fromLonLat([
      position.longitude,
      MathUtils.clamp(
        position.latitude,
        -WEB_MERCATOR_MAX_LATITUDE_DEGREES,
        WEB_MERCATOR_MAX_LATITUDE_DEGREES
      ),
    ]);
  }

  getCoordinateFromPixel(pixel: number[]): number[] | undefined {
    const point = this.pickGround(pixel);
    return point ? this.mapCoordinate(point) : undefined;
  }

  // MapStore uses Mercator meters per CSS pixel; the scene uses ECEF meters.
  private resolutionAtDistance(distance: number, latitude: number): number {
    const camera = this.getCamera()!;
    const view = this.instance!.view;
    const size = camera.getViewSize(distance, new Vector2());
    const latitudeScale = Math.max(
      Math.cos(MathUtils.degToRad(latitude)),
      0.01
    );
    return size.y / view.height / latitudeScale;
  }

  getViewState(): MapViewState | null {
    const camera = this.getCamera();
    const focus = this.getCameraFocus();
    if (!camera || !focus || !this.map || !this.started) return null;
    const position = new Coordinates(CoordinateSystem.epsg4978, focus).as(
      CoordinateSystem.epsg4326
    );
    const frame = this.map.ellipsoid.getEastNorthUpMatrix(
      position.latitude,
      position.longitude
    );
    const east = new Vector3(1, 0, 0).transformDirection(frame);
    const north = new Vector3(0, 1, 0).transformDirection(frame);
    const cameraUp = new Vector3(0, 1, 0).applyQuaternion(camera.quaternion);
    const rotation = Math.atan2(-cameraUp.dot(east), cameraUp.dot(north));
    const resolution = this.resolutionAtDistance(
      camera.position.distanceTo(focus),
      position.latitude
    );
    if (!Number.isFinite(resolution) || resolution <= 0) return null;
    return {
      zoom: Math.log2(WEB_MERCATOR_ZOOM_ZERO_RESOLUTION / resolution),
      center: this.mapCoordinate(focus),
      rotation,
      resolution,
    };
  }

  setViewState(state: MapViewState): void {
    const camera = this.getCamera();
    const map = this.map;
    if (!camera || !map || !this.instance?.view.height) return;
    const [longitude, latitude] = toLonLat(state.center);
    const focus = map.ellipsoid.toCartesian(latitude, longitude, 0);
    const frame = map.ellipsoid.getEastNorthUpMatrix(latitude, longitude);
    const previousFocus = this.getCameraFocus();
    const tilt = previousFocus
      ? Math.min(
          camera.position
            .clone()
            .sub(previousFocus)
            .angleTo(map.ellipsoid.getNormalFromCartesian(previousFocus)),
          Math.PI / 2 - 0.01
        )
      : 0;
    const distance = state.resolution / this.resolutionAtDistance(1, latitude);
    const offset = new Vector3(
      Math.sin(tilt) * Math.sin(state.rotation),
      -Math.sin(tilt) * Math.cos(state.rotation),
      Math.cos(tilt)
    )
      .transformDirection(frame)
      .multiplyScalar(distance);
    camera.position.copy(focus).add(offset);
    camera.up
      .set(-Math.sin(state.rotation), Math.cos(state.rotation), 0)
      .transformDirection(frame);
    camera.lookAt(focus);
    camera.updateMatrixWorld(true);
    this.controls?.resetState();
    this.controls?.update();
    this.instance.notifyChange(map);
    this.moveEnd();
  }

  setViewOptions({
    zoom,
    center,
    minZoom,
    maxZoom,
    rotation,
    resolution,
  }: MapViewOptions): void {
    if (minZoom !== undefined) this.minZoom = minZoom;
    if (maxZoom !== undefined) this.options.maxZoom = maxZoom;
    const state = this.getViewState();
    if (!state) return;
    const nextZoom = MathUtils.clamp(
      zoom ?? state.zoom,
      this.minZoom,
      this.options.maxZoom
    );
    this.setViewState({
      center: center ?? state.center,
      zoom: nextZoom,
      rotation: rotation ?? state.rotation,
      resolution: resolution ?? state.resolution * 2 ** (state.zoom - nextZoom),
    });
  }

  canZoomBy(delta: number): boolean {
    const state = this.getViewState();
    return (
      !!state &&
      (delta > 0
        ? state.zoom < this.options.maxZoom - ZOOM_EPSILON
        : delta < 0 && state.zoom > this.minZoom + ZOOM_EPSILON)
    );
  }

  zoomBy(delta: number): void {
    if (!this.canZoomBy(delta)) return;
    const state = this.getViewState();
    if (state) {
      this.setViewOptions({ zoom: state.zoom + delta });
    }
  }

  setRotation(rotation: number): void {
    this.setViewOptions({ rotation });
  }

  zoomToExtent(extent: number[], options: MapFitOptions = {}): void {
    const view = this.instance?.view;
    if (!view?.width || !view.height) return;
    const width = extent[2] - extent[0];
    const height = extent[3] - extent[1];
    const center = [(extent[0] + extent[2]) / 2, (extent[1] + extent[3]) / 2];
    if (
      options.smartZoom !== false &&
      width < SMART_FIT_EXTENT_SIZE &&
      height < SMART_FIT_EXTENT_SIZE
    ) {
      this.setViewOptions({
        center,
        zoom: Math.max(SMART_FIT_MIN_ZOOM, this.getViewState()?.zoom ?? 0),
      });
    } else {
      const resolution = Math.max(width / view.width, height / view.height);
      const zoom = MathUtils.clamp(
        Math.log2(WEB_MERCATOR_ZOOM_ZERO_RESOLUTION / resolution),
        this.minZoom,
        this.options.maxZoom
      );
      this.setViewOptions({
        center,
        zoom,
        resolution: WEB_MERCATOR_ZOOM_ZERO_RESOLUTION / 2 ** zoom,
      });
    }
    options.callback?.(true);
  }

  getExtent(): number[] | undefined {
    const view = this.instance?.view;
    if (!view || !this.started) return;
    const coordinates = [
      [0, 0],
      [view.width, 0],
      [view.width, view.height],
      [0, view.height],
    ].map((pixel) => this.getCoordinateFromPixel(pixel));
    // When the horizon is visible, corners can fall outside the globe.
    if (coordinates.some((coordinate) => !coordinate)) {
      return getProjection(DEFAULT_MAP_PROJECTION)?.getExtent();
    }
    return boundingExtent(coordinates as number[][]);
  }

  setBackgroundColor(color: string): void {
    if (!this.instance || !this.map) return;
    this.instance.scene.background = new Color(color || "#ffffff");
    this.map.backgroundColor = color || "#ffffff";
    this.instance.notifyChange(this.map);
  }

  subscribe(callback: () => void): () => void {
    this.changeListeners.add(callback);
    return () => {
      this.changeListeners.delete(callback);
    };
  }

  subscribeMoveEnd(callback: () => void): () => void {
    this.moveEndListeners.add(callback);
    return () => {
      this.moveEndListeners.delete(callback);
    };
  }

  subscribeClick(callback: (event: MapClickEvent) => void): () => void {
    const instance = this.instance;
    if (!instance) return () => {};
    const canvas = instance.domElement;
    let pointerType = "mouse";
    let start = new Vector2();
    let moved = false;
    let clickTimeout: ReturnType<typeof setTimeout> | undefined;
    const cancelClick = () => {
      clearTimeout(clickTimeout);
      clickTimeout = undefined;
    };
    const onPointerDown = (event: PointerEvent) => {
      pointerType = event.pointerType;
      start = new Vector2(event.clientX, event.clientY);
      moved = false;
    };
    const onPointerMove = (event: PointerEvent) => {
      moved ||= start.distanceTo(new Vector2(event.clientX, event.clientY)) > 5;
    };
    const onClick = (event: MouseEvent) => {
      if (event.button !== 0 || moved) return;
      if (clickTimeout !== undefined) {
        cancelClick();
        return;
      }
      const click = {
        pixel: instance.eventToCanvasCoords(event, new Vector2()).toArray(),
        pointerType,
      };
      clickTimeout = setTimeout(() => {
        clickTimeout = undefined;
        callback(click);
      }, 250);
    };
    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("click", onClick);
    canvas.addEventListener("dblclick", cancelClick);
    const dispose = () => {
      if (!this.clickDisposers.delete(dispose)) return;
      cancelClick();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("click", onClick);
      canvas.removeEventListener("dblclick", cancelClick);
    };
    this.clickDisposers.add(dispose);
    return dispose;
  }

  resize(): void {
    const instance = this.instance;
    const target = this.target;
    if (!instance || !target?.clientWidth || !target.clientHeight) return;
    instance.engine.onWindowResize(target.clientWidth, target.clientHeight);
    instance.view.setSize(target.clientWidth, target.clientHeight);
    instance.notifyChange();
    this.notify();
  }
}
