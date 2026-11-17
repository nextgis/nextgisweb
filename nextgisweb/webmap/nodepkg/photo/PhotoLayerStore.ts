import { action, computed, observableRef } from "mobx";

import type { FeatureAttachment } from "@nextgisweb/feature-attachment/type";
import type { FeatureItem } from "@nextgisweb/feature-layer/type";
import { route } from "@nextgisweb/pyramid/api";
import { ServerResponseError } from "@nextgisweb/pyramid/api/error";

import { getPhotosFromFeature } from "./util/getPhotosFromFeature";

export interface Photo {
  featureId: number;
  attachment: FeatureAttachment;
}

export interface PhotoLayerStoreOptions {
  layerId: number;
  hasPhotos?: boolean;
}

export class PhotoLayerStore {
  readonly layerId: number;

  @observableRef accessor photos: Photo[] | undefined = undefined;
  @observableRef accessor knownHasPhotos: boolean | undefined = undefined;
  @observableRef accessor isLoading = false;
  @observableRef accessor error: unknown = undefined;

  private loadController?: AbortController;
  private featureUpdateListeners = new Set<(featureId?: number) => void>();
  private featureControllers = new Map<number, AbortController>();
  private activeCount = 0;

  constructor({ layerId, hasPhotos }: PhotoLayerStoreOptions) {
    this.layerId = layerId;
    this.knownHasPhotos = hasPhotos;
  }

  @computed
  get hasPhotos(): boolean | undefined {
    return this.photos ? this.photos.length > 0 : this.knownHasPhotos;
  }

  async load() {
    this.loadController?.abort();
    this.abortFeatureUpdates();
    const ctrl = new AbortController();
    this.loadController = ctrl;
    const { signal } = ctrl;

    this.setLoading(true);
    try {
      const features = await route(
        "feature_layer.feature.collection",
        this.layerId
      ).get<FeatureItem[]>({
        query: { geom: false, fields: [], extensions: ["attachment"] },
        signal,
      });
      if (signal.aborted) return;
      this.setPhotos(features.flatMap(getPhotosFromFeature));
      this.notifyFeatureUpdate();
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

  async updateFeature(featureId: number) {
    if (this.loadController) {
      this.load();
      return;
    }

    this.featureControllers.get(featureId)?.abort();
    const ctrl = new AbortController();
    this.featureControllers.set(featureId, ctrl);
    const { signal } = ctrl;

    try {
      const feature = await route("feature_layer.feature.item", {
        id: this.layerId,
        fid: featureId,
      }).get<FeatureItem>({
        query: { geom: false, fields: [], extensions: ["attachment"] },
        signal,
      });
      if (signal.aborted) return;
      this.applyFeaturePhotos(featureId, getPhotosFromFeature(feature));
    } catch (err) {
      if (signal.aborted) return;
      if (err instanceof ServerResponseError && err.status_code === 404) {
        this.applyFeaturePhotos(featureId, []);
      } else if (this.photos) {
        this.load();
      }
    } finally {
      if (this.featureControllers.get(featureId) === ctrl) {
        this.featureControllers.delete(featureId);
      }
    }
  }

  activate() {
    this.activeCount++;
    if (!this.photos) this.load();
  }

  deactivate() {
    this.activeCount = Math.max(0, this.activeCount - 1);
    if (this.activeCount === 0) this.abortLoad();
  }

  subscribeFeatureUpdate(listener: (featureId?: number) => void) {
    this.featureUpdateListeners.add(listener);
    return () => {
      this.featureUpdateListeners.delete(listener);
    };
  }

  private applyFeaturePhotos(featureId: number, featurePhotos: Photo[]) {
    if (this.photos) {
      this.replaceFeaturePhotos(featureId, featurePhotos);
    } else if (featurePhotos.length > 0) {
      this.setKnownHasPhotos(true);
    } else if (this.knownHasPhotos) {
      this.load();
      return;
    }
    this.notifyFeatureUpdate(featureId);
  }

  private notifyFeatureUpdate(featureId?: number) {
    this.featureUpdateListeners.forEach((listener) => listener(featureId));
  }

  private abortFeatureUpdates() {
    this.featureControllers.forEach((ctrl) => ctrl.abort());
    this.featureControllers.clear();
  }

  @action
  private replaceFeaturePhotos(featureId: number, featurePhotos: Photo[]) {
    if (!this.photos) return;
    const rest = this.photos.filter((p) => p.featureId !== featureId);
    const index = rest.findIndex((p) => p.featureId > featureId);
    const at = index === -1 ? rest.length : index;
    this.photos = [...rest.slice(0, at), ...featurePhotos, ...rest.slice(at)];
  }

  @action
  private setKnownHasPhotos(value: boolean) {
    this.knownHasPhotos = value;
  }

  @action
  private setPhotos(photos: Photo[]) {
    this.photos = photos;
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
}
