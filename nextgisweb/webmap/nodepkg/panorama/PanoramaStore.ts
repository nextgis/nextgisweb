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
  @observableRef accessor pov: PanoramaPov = { heading: 0, pitch: 0 };
  @observableRef accessor status: PanoramaStatus | null = null;

  @actionBound
  setProvider(provider: PanoramaProviderIdentity) {
    this.provider = provider;
  }

  @actionBound
  setPosition(lat: number, lng: number) {
    this.position = { lat, lng };
  }

  @actionBound
  setPov(heading: number, pitch: number) {
    this.pov = { heading, pitch };
  }

  @actionBound
  setStatus(status: PanoramaStatus) {
    this.status = status;
  }

  @actionBound
  clear() {
    this.position = null;
    this.pov = { heading: 0, pitch: 0 };
    this.status = null;
  }
}
