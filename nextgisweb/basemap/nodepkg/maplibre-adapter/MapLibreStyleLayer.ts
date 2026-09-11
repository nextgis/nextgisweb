import "maplibre-gl/dist/maplibre-gl.css";

import { Map as MapLibreMap, setWorkerUrl } from "maplibre-gl";
import type { FrameState } from "ol/Map";
import Layer from "ol/layer/Layer";
import type { Options as LayerOptions } from "ol/layer/Layer";
import { toDegrees } from "ol/math";
import { toLonLat } from "ol/proj";
import LayerRenderer from "ol/renderer/Layer";
import type { Size } from "ol/size";
import Source from "ol/source/Source";

setWorkerUrl(`${ngwConfig.staticUrl}basemap/maplibre-worker.js`);

type MapLibreStyleLayerOptions = LayerOptions<Source> & {
  style: string;
};

function getMapLibreCenter(frameState: FrameState): [number, number] {
  const { center, projection } = frameState.viewState;
  const [longitude, latitude] = toLonLat(center, projection);
  return [longitude, latitude];
}

class MapLibreStyleLayerRenderer extends LayerRenderer<MapLibreStyleLayer> {
  private readonly container: HTMLDivElement;
  private readonly styleUrl: string;

  private mapLibreMap: MapLibreMap | null = null;
  private resizeFrame: number | null = null;
  private renderedSize: [number, number] | null = null;

  constructor(layer: MapLibreStyleLayer, styleUrl: string) {
    super(layer);

    this.styleUrl = styleUrl;
    this.container = document.createElement("div");
    this.container.style.position = "absolute";
    this.container.style.visibility = "hidden";
  }

  prepareFrame() {
    return true;
  }

  renderFrame(frameState: FrameState) {
    const sizeChanged = this.updateSize(frameState.size);
    const mapLibreMap = this.getOrCreateMap(frameState);
    const { viewState } = frameState;

    mapLibreMap.jumpTo({
      roll: 0,
      zoom: viewState.zoom - 1,
      pitch: 0,
      center: getMapLibreCenter(frameState),
      bearing: toDegrees(-viewState.rotation),
      elevation: 0,
    });

    this.container.style.opacity = String(this.getLayer().getOpacity());

    if (this.container.isConnected) {
      if (sizeChanged) mapLibreMap.resize();
      mapLibreMap.redraw();
    } else {
      this.scheduleResize();
    }

    return this.container;
  }

  private getOrCreateMap(frameState: FrameState) {
    if (this.mapLibreMap) return this.mapLibreMap;

    const { viewState } = frameState;
    const mapLibreMap = new MapLibreMap({
      zoom: viewState.zoom - 1,
      center: getMapLibreCenter(frameState),
      bearing: toDegrees(-viewState.rotation),
      container: this.container,
      interactive: false,
      trackResize: false,
      fadeDuration: 0,
      maplibreLogo: false,
      attributionControl: false,
      centerClampedToGround: false,
      // Print export reads the canvas asynchronously, after the frame is shown.
      canvasContextAttributes: { preserveDrawingBuffer: true },
    });

    mapLibreMap.once("load", () => {
      this.container.style.visibility = "visible";
    });

    mapLibreMap.setStyle(this.styleUrl, {
      transformStyle: (_previous, next) => {
        const { terrain: _, ...result } = next;
        return result;
      },
    });

    this.mapLibreMap = mapLibreMap;
    return mapLibreMap;
  }

  private updateSize(size: Size) {
    if (
      this.renderedSize?.[0] === size[0] &&
      this.renderedSize?.[1] === size[1]
    ) {
      return false;
    }

    this.renderedSize = [size[0], size[1]];
    this.container.style.width = `${size[0]}px`;
    this.container.style.height = `${size[1]}px`;
    return true;
  }

  private scheduleResize() {
    if (this.resizeFrame !== null) return;

    this.resizeFrame = requestAnimationFrame(() => {
      this.resizeFrame = null;
      if (!this.mapLibreMap || !this.container.isConnected) return;

      this.mapLibreMap.resize();
      this.mapLibreMap.redraw();
    });
  }

  protected disposeInternal() {
    if (this.resizeFrame !== null) {
      cancelAnimationFrame(this.resizeFrame);
      this.resizeFrame = null;
    }

    this.mapLibreMap?.remove();
    this.mapLibreMap = null;
    this.container.remove();
    super.disposeInternal();
  }
}

export class MapLibreStyleLayer extends Layer<
  Source,
  MapLibreStyleLayerRenderer
> {
  private readonly styleUrl: string;

  constructor(options: MapLibreStyleLayerOptions) {
    const { style, ...layerOptions } = options;

    super({
      ...layerOptions,
      source: layerOptions.source ?? new Source({ attributions: [] }),
    });
    this.styleUrl = style;
  }

  protected createRenderer() {
    return new MapLibreStyleLayerRenderer(this, this.styleUrl);
  }
}
