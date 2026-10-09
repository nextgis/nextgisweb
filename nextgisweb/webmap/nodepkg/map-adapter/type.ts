import type { FitOptions } from "ol/View";

import type { NgwExtent } from "@nextgisweb/feature-layer/type/api";
import type { SRSRef } from "@nextgisweb/spatial-ref-sys/type/api";

import type { LayerAdapters } from "../layer-adapter";
import type { CoreLayer } from "../layer-adapter/CoreLayer";

export interface MapViewState {
  zoom: number;
  center: number[];
  rotation: number;
  resolution: number;
}

export interface MapExtent extends FitOptions {
  extent: NgwExtent;
  srs: SRSRef;
}

export interface MapViewOptions {
  zoom?: number;
  center?: number[];
  rotation?: number;
  resolution?: number;
  minZoom?: number;
  maxZoom?: number;
  extent?: MapExtent;
}

export interface MapFitOptions {
  duration?: number;
  smartZoom?: boolean;
  callback?: (complete: boolean) => void;
  easing?: (progress: number) => number;
}

export interface MapAdapterStatus {
  target: HTMLElement | null;
  started: boolean;
  isLoading: boolean;
}

export interface MapClickEvent {
  pointerType?: string;
  pixel: number[];
}

export interface MapAdapter<TLayer extends CoreLayer = CoreLayer> {
  readonly layerAdapters: LayerAdapters<TLayer>;
  mount(target: HTMLElement): Promise<void>;
  zoomBy(delta: number, duration?: number): void;
  resize(): void;
  unmount(): void;
  addLayer(layer: TLayer): void;
  subscribe(cb: () => void): () => void;
  canZoomBy(delta: number): boolean;
  getExtent(): number[] | undefined;
  getStatus(): MapAdapterStatus;
  removeLayer(layer: TLayer): void;
  setRotation(rotation: number, duration?: number): void;
  getViewState(): MapViewState | null;
  setViewState(state: MapViewState): void;
  zoomToExtent(extent: number[], options?: MapFitOptions): void;
  setViewOptions(options: MapViewOptions): void;
  subscribeClick(cb: (event: MapClickEvent) => void): () => void;
  subscribeMoveEnd(cb: () => void): () => void;
  setBackgroundColor?(color: string): void;
  getCoordinateFromPixel(pixel: number[]): number[] | undefined;
}
