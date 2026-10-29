import type { PanoramaProviderProps } from "../../type";
import { PanoramaProvider } from "../PanoramaProvider";

import { createPanoramaPlayer } from "./api";

export default function GooglePanoramaProvider(props: PanoramaProviderProps) {
  return <PanoramaProvider {...props} createPlayer={createPanoramaPlayer} />;
}
