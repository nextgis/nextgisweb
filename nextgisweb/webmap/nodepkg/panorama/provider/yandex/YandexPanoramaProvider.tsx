import type { PanoramaProviderProps } from "../../type";
import { PanoramaProvider } from "../PanoramaProvider";

import { createPanoramaPlayer } from "./api";

export default function YandexPanoramaProvider(props: PanoramaProviderProps) {
  return <PanoramaProvider {...props} createPlayer={createPanoramaPlayer} />;
}
