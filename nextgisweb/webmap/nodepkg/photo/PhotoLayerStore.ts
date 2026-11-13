import { action, observableRef } from "mobx";

import type { FeatureAttachment } from "@nextgisweb/feature-attachment/type";
import type { FeatureItem } from "@nextgisweb/feature-layer/type";
import { route } from "@nextgisweb/pyramid/api";

export interface PhotoId {
  featureId: number;
  attachmentId: number;
}

export class PhotoLayerStore {
  readonly layerId: number;

  @observableRef accessor photos: PhotoId[] = [];
  @observableRef accessor hasPhotos: boolean;
  @observableRef accessor isLoading = false;
  @observableRef accessor error: unknown = undefined;

  constructor(layerId: number, hasPhotos: boolean) {
    this.layerId = layerId;
    this.hasPhotos = hasPhotos;
  }

  async load(signal?: AbortSignal) {
    this.setLoading(true);
    try {
      const photos = await this.fetchPhotos(signal);
      if (signal?.aborted) return;
      this.setPhotos(photos ?? []);
    } catch (err) {
      if (signal?.aborted) return;
      this.setError(err);
      throw err;
    } finally {
      this.setLoading(false);
    }
  }

  async check(signal?: AbortSignal) {
    let found = false;
    try {
      await this.fetchPhotos(signal, () => {
        found = true;
      });
    } catch (err) {
      if (signal?.aborted) return;
      throw err;
    }
    if (signal?.aborted) return;
    this.setHasPhotos(found);
  }

  @action
  private setPhotos(photos: PhotoId[]) {
    this.photos = photos;
    this.hasPhotos = photos.length > 0;
  }

  @action
  private setHasPhotos(value: boolean) {
    this.hasPhotos = value;
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

    const photos: PhotoId[] = [];
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
