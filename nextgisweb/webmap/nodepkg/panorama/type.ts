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
}

export type PanoramaProviderHost = {
  setPosition(lat: number, lng: number): Promise<AvailabilityStatus>;
  setProvider(identity: PanoramaProviderIdentity): Promise<void>;
  checkAvailability(
    identity: PanoramaProviderIdentity,
    lat: number,
    lng: number
  ): Promise<AvailabilityResult>;
};

export type PanoramaMessageHandler = {
  onPositionChanged(lat: number, lng: number): void;
  onPovChanged(heading: number, pitch: number): void;
};

export interface PanoramaProviderProps extends PanoramaMessageHandler {
  apiKey: string;
  title: string;
  position: PanoramaPosition;
  onStatusChanged: (status: AvailabilityStatus) => void;
}
