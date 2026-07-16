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
  const [red, setRed] = useState(255);
  const [green, setGreen] = useState(255);
  const [blue, setBlue] = useState(255);
  const [alpha, setAlpha] = useState(100);

  const mountedRef = useRef(false);

  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }

    onChange({
      red,
      green,
      blue,
      ...(hasAlpha ? { alpha } : {}),
    });
  }, [red, green, blue, alpha, hasAlpha, onChange]);

  return (
    <MapControl order={100} position="top-right" margin>
      <Space style={{ width: 180 }} orientation="vertical">
        <Slider
          min={0}
          max={255}
          step={1}
          value={red}
          onChange={setRed}
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
          value={green}
          onChange={setGreen}
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
          value={blue}
          onChange={setBlue}
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
            value={alpha}
            onChange={setAlpha}
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
