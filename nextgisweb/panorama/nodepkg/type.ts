export type AvailabilityStatus = "available" | "unavailable" | "error";

export type IAvailabilityCheckable = {
  checkAvailability(lat: number, lng: number): Promise<AvailabilityStatus>;
};

export type PanoramaMessageEmitter = IAvailabilityCheckable & {
  setPosition(lat: number, lng: number): void;
};

export type PanoramaMessageHandler = {
  onPositionChanged(lat: number, lng: number): void;
  onPovChanged(heading: number, pitch: number): void;
  onUnavailable(): void;
};

export interface PanoramaProviderProps {
  apiKey: string | null;
  title: string;
}

export interface PanoramaProvider extends IAvailabilityCheckable {
  showPosition(lat: number, lng: number, handler: PanoramaMessageHandler): void;
}
