export interface LayerProperties {
  name: string;
  title: string;
  isTopLayer: boolean;
  isBaseLayer: boolean;
}

export interface CoreLayer extends LayerProperties {
  setVisibility(visibility: boolean): void;
  setOpacity(opacity: number): void;
  setZIndex(zIndex: number): void;
  dispose(): void;
  reload(): void;
}
