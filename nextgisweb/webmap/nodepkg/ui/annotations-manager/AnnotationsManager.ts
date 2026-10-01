import { actionBound, computed, observableRef } from "mobx";

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

  @observableRef accessor visibleMode: AnnotationVisibleMode | null = null;
  @observableRef accessor filter: AccessFilter = {
    public: true,
    own: true,
    private: false,
  };
  @observableRef accessor activeGeometryType: AnnotationGeometryType | null =
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

  @actionBound
  start(): void {
    if (!this.enabled) {
      this.stop();
      return;
    }

    this.activeGeometryType = null;
    this.visibleMode = this._getInitialVisibleMode();
  }

  @actionBound
  stop(): void {
    this.activeGeometryType = null;
    this.visibleMode = null;
  }

  @actionBound
  setVisibleMode(visibleMode: AnnotationVisibleMode | null): void {
    this.visibleMode = visibleMode;
  }

  @actionBound
  setFilter(filter: AccessFilter): void {
    this.filter = filter;
  }

  @actionBound
  activateAddMode(geometryType: AnnotationGeometryType): void {
    this.activeGeometryType = geometryType;
  }

  @actionBound
  deactivateAddMode(): void {
    this.activeGeometryType = null;
  }

  @actionBound
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
