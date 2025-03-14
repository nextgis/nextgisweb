import { MapComponent } from "./MapComponent";
import { NGWLayer } from "./NGWLayer";
import { UrlLayer } from "./UrlLayer";
import type { LayerType } from "./hook/useNGWLayer";

export * from "./control";

export type { ControlOptions, ControlProps } from "./control/MapControl";

export { UrlLayer, NGWLayer, MapComponent };
export type { LayerType };
