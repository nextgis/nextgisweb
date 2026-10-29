import type { PanoramaProviderIdentity } from "@nextgisweb/webmap/type/api";

export type { PanoramaProviderIdentity };

export type AvailabilityStatus = "available" | "unavailable" | "error";
export type PanoramaStatus = AvailabilityStatus | "loading";

export interface PanoramaPosition {
  lat: number;
  lng: number;
}

export type AvailabilityResult =
  | { status: "available"; position: PanoramaPosition }
  | { status: "unavailable" | "error" };

export interface PanoramaPov {
  heading: number;
  pitch: number;
  fov: number;
}

export type PanoramaProviderHost = {
  show(
    identity: PanoramaProviderIdentity,
    position: PanoramaPosition,
    pov: PanoramaPov
  ): Promise<AvailabilityStatus>;
  checkAvailability(
    identity: PanoramaProviderIdentity,
    lat: number,
    lng: number
  ): Promise<AvailabilityResult>;
};

export type PanoramaMessageHandler = {
  onPositionChanged(position: PanoramaPosition): void;
  onPovChanged(pov: PanoramaPov): void;
};

export interface PanoramaPlayer {
  show(
    position: PanoramaPosition,
    pov: PanoramaPov
  ): Promise<AvailabilityStatus>;
  destroy(): void;
}

export type PanoramaPlayerFactory = (
  container: HTMLElement,
  apiKey: string,
  handler: PanoramaMessageHandler
) => PanoramaPlayer;

export interface PanoramaProviderProps extends PanoramaMessageHandler {
  apiKey: string;
  title: string;
  position: PanoramaPosition;
  pov: PanoramaPov;
  onStatusChanged: (status: AvailabilityStatus) => void;
}
