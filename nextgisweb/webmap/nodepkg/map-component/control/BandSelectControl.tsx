import { Select, Slider } from "@nextgisweb/gui/antd";
import { gettextf } from "@nextgisweb/pyramid/i18n";
import type { RasterBand } from "@nextgisweb/raster-layer/type/api";

import { ALPHA } from "./RGBIntensityControl";

import { MapControl } from ".";

const msgBand = gettextf("Band {}");

type ControlPosition =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export function BandSelectControl({
  bands,
  value = 0,
  position = "top-right",
  alphaValue = 100,
  onAlphaChange,
  onChange,
}: {
  bands: RasterBand[];
  value?: number;
  position?: ControlPosition;
  alphaValue?: number;
  onAlphaChange?: (val: number) => void;
  onChange: (val: number) => void;
}) {
  const bandsWithoutAlpha = bands.filter(
    (b) => b.color_interp !== "Alpha" && b.color_interp !== "Palette"
  );
  const hasAlpha = bands.some((b) => b.color_interp === "Alpha");
  const isRightPosition =
    position === "bottom-right" || position === "top-right";

  if (bandsWithoutAlpha.length < 2 && !hasAlpha) {
    return null;
  }

  return (
    <MapControl order={100} position={position} margin>
      <div
        style={{
          width: 180,
          display: "flex",
          flexDirection: "column",
          alignItems: isRightPosition ? "flex-end" : "flex-start",
        }}
      >
        {bandsWithoutAlpha.length >= 2 && (
          <Select
            value={value}
            onChange={onChange}
            options={bandsWithoutAlpha.map((_b, index) => ({
              value: index,
              label: msgBand(index + 1),
            }))}
          />
        )}

        {hasAlpha && onAlphaChange && (
          <div style={{ width: 180 }}>
            <Slider
              min={0}
              max={100}
              step={1}
              value={alphaValue}
              onChange={onAlphaChange}
              tooltip={{ open: false }}
              styles={{
                track: { backgroundColor: ALPHA },
                handle: { borderColor: ALPHA },
              }}
            />
          </div>
        )}
      </div>
    </MapControl>
  );
}
