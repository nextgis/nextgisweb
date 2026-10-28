import type Instance from "@giro3d/giro3d/core/Instance";
import { ColorLayer } from "@giro3d/giro3d/core/layer/ColorLayer";
import type GiroMap from "@giro3d/giro3d/entities/Map";
import type ImageSource from "@giro3d/giro3d/sources/ImageSource";

import type {
  CoreLayer,
  LayerProperties,
} from "@nextgisweb/webmap/layer-adapter/CoreLayer";

export interface GiroLayerOptions extends Partial<LayerProperties> {
  visible?: boolean;
  opacity?: number;
}

export class GiroLayerAdapter implements CoreLayer {
  readonly name: string;
  readonly title: string;
  isBaseLayer: boolean;
  isTopLayer: boolean;
  readonly layer: ColorLayer;
  zIndex = 0;
  whenReady: Promise<void> = Promise.resolve();
  protected disposed = false;
  private map: GiroMap | undefined;
  private pending = false;

  constructor(
    protected readonly instance: Instance,
    options: GiroLayerOptions,
    source: ImageSource,
    private readonly onOrderChange: () => void
  ) {
    this.layer = new ColorLayer({
      name: options.title,
      source,
      opacity: options.opacity,
    });
    this.name = options.name ?? this.layer.id;
    this.title = options.title ?? this.name;
    this.isBaseLayer = options.isBaseLayer ?? false;
    this.isTopLayer = options.isTopLayer ?? false;
    this.layer.visible = options.visible ?? true;
  }

  attach(map: GiroMap): void {
    if (this.disposed || this.map === map) return;
    this.detach();
    this.map = map;
    this.pending = true;
    this.whenReady = map
      .addLayer(this.layer)
      .then(() => {
        if (this.map !== map || this.disposed) {
          map.removeLayer(this.layer);
        } else {
          this.onOrderChange();
        }
      })
      .catch((error: unknown) => {
        map.removeLayer(this.layer);
        if (!this.disposed) console.error(error);
      })
      .finally(() => {
        this.pending = false;
        if (this.disposed) this.layer.dispose();
      });
  }

  detach(): void {
    this.map?.removeLayer(this.layer);
    this.map = undefined;
  }

  setVisibility(visible: boolean): void {
    if (this.disposed) return;
    this.layer.visible = visible;
    this.instance.notifyChange(this.layer);
  }

  setOpacity(opacity: number): void {
    if (this.disposed) return;
    this.layer.opacity = opacity;
    this.instance.notifyChange(this.layer);
  }

  setZIndex(zIndex: number): void {
    this.zIndex = zIndex;
    this.onOrderChange();
  }

  reload(): void {
    if (!this.disposed) this.layer.source.update();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.detach();
    // Initialization may still be using the source and creating GPU resources.
    if (!this.pending) this.layer.dispose();
  }
}
