import { action, observableRef } from "mobx";

import type { FeatureAttachment } from "@nextgisweb/feature-attachment/type";
import type { FeatureItem } from "@nextgisweb/feature-layer/type";
import { route } from "@nextgisweb/pyramid/api";

export interface Photo {
  featureId: number;
  attachmentId: number;
}

export class PhotoLayerStore {
  readonly layerId: number;

  @observableRef accessor visiblePhotos: Photo[] | undefined = undefined;
  @observableRef accessor layerHasPhotos: boolean;

  @observableRef accessor isLoading = false;
  @observableRef accessor error: unknown = undefined;

  private loadController?: AbortController;
  private checkController?: AbortController;
  private activeCount = 0;

  constructor({
    layerId,
    hasInitialPhotos,
  }: {
    layerId: number;
    hasInitialPhotos: boolean;
  }) {
    this.layerId = layerId;
    this.layerHasPhotos = hasInitialPhotos;
  }

  async load() {
    this.loadController?.abort();
    const ctrl = new AbortController();
    this.loadController = ctrl;
    const { signal } = ctrl;

    this.setLoading(true);
    try {
      const photos = await this.fetchPhotos(signal);
      if (signal.aborted) return;
      this.setVisiblePhotos(photos ?? []);
      this.setLayerHasPhotos(!!photos?.length);
    } catch (err) {
      if (signal.aborted) return;
      this.setError(err);
    } finally {
      if (this.loadController === ctrl) {
        this.loadController = undefined;
        this.setLoading(false);
      }
    }
  }

  abortLoad() {
    if (!this.loadController) return;
    this.loadController.abort();
    this.loadController = undefined;
    this.setLoading(false);
  }

  activate() {
    this.activeCount++;
    this.load();
  }

  deactivate() {
    this.activeCount = Math.max(0, this.activeCount - 1);
    if (this.activeCount === 0) this.abortLoad();
  }

  refresh() {
    if (this.activeCount > 0) {
      this.abortCheck();
      this.load();
    } else {
      this.check();
    }
  }

  async check() {
    this.checkController?.abort();
    const ctrl = new AbortController();
    this.checkController = ctrl;
    const { signal } = ctrl;

    let found = false;
    try {
      await this.fetchPhotos(signal, () => {
        found = true;
      });
    } catch {
      if (!signal.aborted) this.setLayerHasPhotos(false);
      return;
    } finally {
      if (this.checkController === ctrl) {
        this.checkController = undefined;
      }
    }
    if (signal.aborted) return;
    this.setLayerHasPhotos(found);
  }

  abortCheck() {
    this.checkController?.abort();
    this.checkController = undefined;
  }

  @action
  private setVisiblePhotos(photos: Photo[]) {
    this.visiblePhotos = photos;
  }

  @action
  private setLayerHasPhotos(value: boolean) {
    this.layerHasPhotos = value;
  }

  @action
  private setLoading(value: boolean) {
    this.isLoading = value;
    if (value) this.error = undefined;
  }

  @action
  private setError(err: unknown) {
    this.error = err;
  }

  private async fetchPhotos(signal?: AbortSignal, onPhotoNoticed?: () => void) {
    const features = await route(
      "feature_layer.feature.collection",
      this.layerId
    ).get<FeatureItem[]>({
      query: { geom: false, fields: [], extensions: ["attachment"] },
      signal,
    });

    const photos: Photo[] = [];
    for (const feature of features) {
      const attachments = feature.extensions.attachment as
        | FeatureAttachment[]
        | null;
      if (!attachments) continue;
      for (const attachment of attachments) {
        if (!attachment.is_image) continue;
        if (onPhotoNoticed) {
          onPhotoNoticed();
          return;
        }
        photos.push({ featureId: feature.id, attachmentId: attachment.id });
      }
    }
    return photos;
  }
}
