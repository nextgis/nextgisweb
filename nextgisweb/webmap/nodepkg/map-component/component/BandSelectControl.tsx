import { Select } from "@nextgisweb/gui/antd";
import { gettextf } from "@nextgisweb/pyramid/i18n";
import type { RasterBand } from "@nextgisweb/raster-layer/type/api";

import { MapControl } from "../control";

const msgBand = gettextf("Band {}");

export function BandSelectControl({
  bands,
  value = 0,
  onChange,
}: {
  bands: RasterBand[];
  value?: number;
  onChange: (val: number) => void;
}) {
  const bandsWithoutAlpha = bands.filter((b) => b.color_interp !== "Alpha");

  if (bandsWithoutAlpha.length < 2) {
    return null;
  }

  return (
    <MapControl order={100} position="top-right" margin>
      <Select
        defaultValue={value}
        onChange={onChange}
        options={bandsWithoutAlpha.map((_b, index) => ({
          value: index,
          label: msgBand(index + 1),
        }))}
      />
    </MapControl>
  );
}
