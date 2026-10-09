import OlMap from "ol/Map";
import type { MapOptions } from "ol/Map";
import { unByKey } from "ol/Observable";
import View from "ol/View";
import type { FitOptions } from "ol/View";
import { easeOut } from "ol/easing";
import type { EventsKey } from "ol/events";
import { getCenter, getHeight, getWidth } from "ol/extent";
import type { Extent } from "ol/extent";
import Interaction from "ol/interaction/Interaction";

import { imageQueue } from "@nextgisweb/pyramid/util";

import {
  DEFAULT_MAP_MAX_ZOOM,
  DEFAULT_MAP_PROJECTION,
  DEFAULT_VIEW_ANIMATION_DURATION,
  SMART_FIT_EXTENT_SIZE,
  SMART_FIT_MIN_ZOOM,
} from "../map-adapter/constant";
import type {
  MapAdapter,
  MapAdapterStatus,
  MapClickEvent,
  MapFitOptions,
  MapViewOptions,
  MapViewState,
} from "../map-adapter/type";

import type { OlLayerAdapter } from "./layer/OlLayerAdapter";
import { layerAdapters } from "./layerAdapters";
import { mapStartup } from "./util/mapStartup";

import "ol/ol.css";

export class OpenLayersMapAdapter implements MapAdapter<OlLayerAdapter> {
  readonly maxZoom = DEFAULT_MAP_MAX_ZOOM;
  readonly displayProjection = DEFAULT_MAP_PROJECTION;

  readonly map: OlMap;
  readonly layerAdapters = layerAdapters;

  private status: MapAdapterStatus = {
    target: null,
    started: false,
    isLoading: false,
  };
  private readonly changeListeners = new Set<() => void>();
  private readonly clickDisposers = new Set<() => void>();
  private viewKeys: EventsKey[] = [];
  private mountKeys: EventsKey[] = [];
  private stopMapStartup?: () => void;

  constructor({
    constrainingExtent,
    ...viewOptions
  }: Omit<MapOptions, "target"> & { constrainingExtent?: Extent } = {}) {
    if (!viewOptions.view) {
      viewOptions.view = new View({
        maxZoom: this.maxZoom,
        projection: this.displayProjection,
        // Must always be true for correct tile caching with image adapters
        constrainResolution: true,
        extent: constrainingExtent,
      });
    }
    this.map = new OlMap(viewOptions);
  }

  addLayer(layer: OlLayerAdapter): void {
    this.map.addLayer(layer.getLayer());
  }

  removeLayer(layer: OlLayerAdapter): void {
    this.map.removeLayer(layer.getLayer());
  }

  async mount(target: HTMLElement): Promise<void> {
    this.unmount();
    this.mountKeys = [
      this.map.on("loadstart", () => {
        this.status.isLoading = true;
        this.notify();
      }),
      this.map.on("loadend", () => {
        this.status.isLoading = false;
        this.notify();
      }),
      this.map.on("moveend", this.notify),
      this.map.once("rendercomplete", this.notify),
      // Workaround to skip first map move event on start
      this.map.once("movestart", () => {
        let canceled = false;
        let stopStartup: (() => void) | undefined;
        this.stopMapStartup = () => {
          canceled = true;
          stopStartup?.();
        };
        imageQueue.waitAll().then(() => {
          if (canceled) return;
          stopStartup = mapStartup({ olMap: this.map, queue: imageQueue });
        });
      }),
    ];
    this.map.setTarget(target);
    this.status.started = true;
    this.status.target = this.map.getTargetElement() ?? null;
    this.notify();
  }

  unmount(): void {
    for (const dispose of this.clickDisposers) {
      dispose();
    }
    this.mountKeys.forEach(unByKey);
    this.mountKeys = [];
    this.stopMapStartup?.();
    this.stopMapStartup = undefined;
    this.map.setTarget(undefined);
    this.status = {
      target: null,
      started: false,
      isLoading: false,
    };
    this.notify();
  }

  getStatus(): MapAdapterStatus {
    return { ...this.status };
  }

  subscribeMoveEnd(cb: () => void): () => void {
    const key = this.map.on("moveend", cb);
    return () => unByKey(key);
  }

  getViewState(): MapViewState | null {
    const view = this.map.getView();
    const center = view.getCenter();
    const zoom = view.getZoom();
    const resolution = view.getResolution();
    if (!center || zoom === undefined || resolution === undefined) return null;
    return {
      zoom,
      center: [...center],
      rotation: view.getRotation(),
      resolution,
    };
  }

  setViewState(state: MapViewState): void {
    const view = this.map.getView();
    view.setCenter(state.center);
    view.setResolution(state.resolution);
    view.setRotation(state.rotation);
  }

  setViewOptions({
    zoom,
    center,
    minZoom,
    maxZoom,
    rotation,
    resolution,
  }: MapViewOptions): void {
    const view = this.map.getView();
    if (minZoom !== undefined) {
      view.setMinZoom(minZoom);
    }
    if (maxZoom !== undefined) {
      view.setMaxZoom(maxZoom);
    }
    if (center) {
      view.setCenter(center);
    }
    if (resolution !== undefined) {
      view.setResolution(resolution);
    } else if (zoom !== undefined) {
      view.setZoom(zoom);
    }
    if (rotation !== undefined) {
      view.setRotation(rotation);
    }
  }

  getExtent(): number[] | undefined {
    if (!this.getViewState()) return undefined;
    return this.map.getView().calculateExtent(this.map.getSize());
  }

  getCoordinateFromPixel(pixel: number[]): number[] | undefined {
    return this.map.getCoordinateFromPixel(pixel) ?? undefined;
  }

  subscribeClick(cb: (event: MapClickEvent) => void): () => void {
    const interaction = new Interaction({
      handleEvent: (event) => {
        if (event.type === "singleclick") {
          cb({
            pixel: [...event.pixel],
            pointerType: (event.originalEvent as PointerEvent).pointerType,
          });
          event.preventDefault();
        }
        return true;
      },
    });
    this.map.addInteraction(interaction);
    const dispose = () => {
      if (!this.clickDisposers.delete(dispose)) return;
      this.map.removeInteraction(interaction);
      interaction.dispose();
    };
    this.clickDisposers.add(dispose);
    return dispose;
  }

  canZoomBy(delta: number): boolean {
    const view = this.map.getView();
    const current = view.getZoom();
    if (current === undefined) return false;
    const next = view.getConstrainedZoom(current + delta);
    if (next === undefined) return false;
    return delta > 0 ? next > current : next < current;
  }

  zoomBy(delta: number, duration = DEFAULT_VIEW_ANIMATION_DURATION): void {
    const view = this.map.getView();
    const current = view.getZoom();
    if (current === undefined) return;
    const zoom = view.getConstrainedZoom(current + delta);
    if (zoom === undefined) return;
    if (duration > 0) {
      if (view.getAnimating()) view.cancelAnimations();
      view.animate({ zoom, duration, easing: easeOut });
    } else {
      view.setZoom(zoom);
    }
  }

  zoomToExtent(
    extent: number[],
    { smartZoom = true, ...fitOptions }: MapFitOptions & FitOptions = {}
  ): void {
    const view = this.map.getView();
    const widthExtent = getWidth(extent);
    const heightExtent = getHeight(extent);

    if (
      smartZoom &&
      widthExtent < SMART_FIT_EXTENT_SIZE &&
      heightExtent < SMART_FIT_EXTENT_SIZE
    ) {
      const center = getCenter(extent);
      view.setCenter(center);

      const zoom = view.getZoom();
      if (zoom === undefined || zoom < SMART_FIT_MIN_ZOOM) {
        view.setZoom(SMART_FIT_MIN_ZOOM);
      }
    } else {
      view.fit(extent, fitOptions);
    }
  }

  setRotation(
    rotation: number,
    duration = DEFAULT_VIEW_ANIMATION_DURATION
  ): void {
    const view = this.map.getView();
    const rotationWithoutFullTurns = view.getRotation() % (2 * Math.PI);
    if (duration > 0 && rotationWithoutFullTurns !== rotation) {
      view.animate({ rotation, duration, easing: easeOut });
    } else {
      view.setRotation(rotation);
    }
  }

  subscribe(cb: () => void): () => void {
    this.changeListeners.add(cb);
    this.bindViewEvents();
    return () => {
      this.changeListeners.delete(cb);
      if (!this.changeListeners.size) {
        this.unbindViewEvents();
      }
    };
  }

  resize(): void {
    this.map.updateSize();
    this.notify();
  }

  private notify = (): void => {
    this.changeListeners.forEach((callback) => callback());
  };

  private bindViewEvents(): void {
    if (this.viewKeys.length) return;
    this.viewKeys = this.map
      .getView()
      .on(
        ["change:resolution", "change:center", "change:rotation"],
        this.notify
      );
    this.notify();
  }

  private unbindViewEvents(): void {
    this.viewKeys.forEach(unByKey);
    this.viewKeys = [];
  }
}
