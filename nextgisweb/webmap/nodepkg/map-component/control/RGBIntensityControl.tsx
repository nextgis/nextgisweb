import { useEffect, useRef, useState } from "react";

import { Slider, Space } from "@nextgisweb/gui/antd";

import { MapControl } from "./MapControl";

interface RGBIntensity {
  red: number;
  green: number;
  blue: number;
  alpha?: number;
}

const RED = "#ff0000";
const GREEN = "#00aa00";
const BLUE = "#0064ff";
export const ALPHA = "#666666";

export function RGBIntensityControl({
  hasAlpha = false,
  onChange,
}: {
  hasAlpha?: boolean;
  onChange: (rgb: RGBIntensity) => void;
}) {
  const [rgba, setRgba] = useState<Required<RGBIntensity>>({
    red: 255,
    green: 255,
    blue: 255,
    alpha: 100,
  });
  const changedRef = useRef(false);

  const update = (channel: keyof RGBIntensity, value: number) => {
    changedRef.current = true;
    setRgba((current) => ({ ...current, [channel]: value }));
  };

  useEffect(() => {
    if (!changedRef.current) {
      return;
    }
    changedRef.current = false;
    const { red, green, blue, alpha } = rgba;

    onChange({
      red,
      green,
      blue,
      ...(hasAlpha ? { alpha } : {}),
    });
  }, [rgba, hasAlpha, onChange]);

  return (
    <MapControl order={100} position="top-right" margin>
      <Space style={{ width: 180 }} orientation="vertical">
        <Slider
          min={0}
          max={255}
          step={1}
          value={rgba.red}
          onChange={(value) => update("red", value)}
          tooltip={{ open: false }}
          styles={{
            track: { backgroundColor: RED },
            handle: { borderColor: RED },
          }}
        />

        <Slider
          min={0}
          max={255}
          step={1}
          value={rgba.green}
          onChange={(value) => update("green", value)}
          tooltip={{ open: false }}
          styles={{
            track: { backgroundColor: GREEN },
            handle: { borderColor: GREEN },
          }}
        />

        <Slider
          min={0}
          max={255}
          step={1}
          value={rgba.blue}
          onChange={(value) => update("blue", value)}
          tooltip={{ open: false }}
          styles={{
            track: { backgroundColor: BLUE },
            handle: { borderColor: BLUE },
          }}
        />

        {hasAlpha && (
          <Slider
            min={0}
            max={100}
            step={1}
            value={rgba.alpha}
            onChange={(value) => update("alpha", value)}
            tooltip={{ open: false }}
            styles={{
              track: { backgroundColor: ALPHA },
              handle: { borderColor: ALPHA },
            }}
          />
        )}
      </Space>
    </MapControl>
  );
}
