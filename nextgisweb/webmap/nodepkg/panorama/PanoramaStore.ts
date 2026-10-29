import { actionBound, observableRef } from "mobx";

import cs from "@nextgisweb/webmap/client-settings";

import type {
  PanoramaPosition,
  PanoramaPov,
  PanoramaProviderIdentity,
  PanoramaStatus,
} from "./type";

export class PanoramaStore {
  @observableRef accessor provider: PanoramaProviderIdentity | null =
    cs.panorama.provider;
  @observableRef accessor position: PanoramaPosition | null = null;
  @observableRef accessor pov: PanoramaPov = { heading: 0, pitch: 0, fov: 90 };
  @observableRef accessor status: PanoramaStatus | null = null;

  @actionBound
  setProvider(provider: PanoramaProviderIdentity) {
    this.provider = provider;
  }

  @actionBound
  setPosition(position: PanoramaPosition) {
    this.position = position;
  }

  @actionBound
  setPov(pov: PanoramaPov) {
    this.pov = pov;
  }

  @actionBound
  setStatus(status: PanoramaStatus) {
    this.status = status;
  }

  @actionBound
  clear() {
    this.position = null;
    this.pov = { heading: 0, pitch: 0, fov: 90 };
    this.status = null;
  }
}

export function panoramaInjection() {
  return new PanoramaStore();
}
