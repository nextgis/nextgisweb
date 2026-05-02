import { action, computed, observable } from "mobx";

import type { Display } from "@nextgisweb/webmap/display";

const allowedUrlValues = ["no", "yes", "messages"] as const;

export type AnnotationVisibleMode = (typeof allowedUrlValues)[number];
export type AnnotationGeometryType = "Point" | "LineString" | "Polygon";

export interface AccessFilter {
  public: boolean;
  own: boolean;
  private: boolean;
}

interface ManagerOptions {
  display: Display;
}

export class AnnotationsManager {
  private _display: Display;

  @observable.ref accessor visibleMode: AnnotationVisibleMode | null = null;
  @observable.ref accessor filter: AccessFilter = {
    public: true,
    own: true,
    private: false,
  };
  @observable.ref accessor activeGeometryType: AnnotationGeometryType | null =
    null;

  constructor({ display }: ManagerOptions) {
    this._display = display;
  }

  @computed
  get enabled(): boolean {
    return !!(
      this._display.config.annotations?.enabled &&
      this._display.config.annotations.scope.read
    );
  }

  @action.bound
  start(): void {
    if (!this.enabled) {
      this.stop();
      return;
    }

    this.activeGeometryType = null;
    this.visibleMode = this._getInitialVisibleMode();
  }

  @action.bound
  stop(): void {
    this.activeGeometryType = null;
    this.visibleMode = null;
  }

  @action.bound
  setVisibleMode(visibleMode: AnnotationVisibleMode | null): void {
    this.visibleMode = visibleMode;
  }

  @action.bound
  setFilter(filter: AccessFilter): void {
    this.filter = filter;
  }

  @action.bound
  activateAddMode(geometryType: AnnotationGeometryType): void {
    this.activeGeometryType = geometryType;
  }

  @action.bound
  deactivateAddMode(): void {
    this.activeGeometryType = null;
  }

  @action.bound
  changeGeometryType(geometryType: AnnotationGeometryType): void {
    if (this.activeGeometryType) {
      this.activeGeometryType = geometryType;
    }
  }

  private _getInitialVisibleMode(): AnnotationVisibleMode {
    const annotUrlParam = this._display.urlParams
      .annot as AnnotationVisibleMode;

    if (annotUrlParam && allowedUrlValues.includes(annotUrlParam)) {
      return annotUrlParam;
    }

    return this._display.config.annotations?.default ?? "no";
  }
}
