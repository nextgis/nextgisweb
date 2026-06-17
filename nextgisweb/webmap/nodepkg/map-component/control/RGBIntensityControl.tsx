import { useCallback, useEffect, useRef, useState } from "react";

import { Form, Slider } from "@nextgisweb/gui/antd";

import { MapControl } from "./MapControl";

interface RGBIntensity {
  red: number;
  green: number;
  blue: number;
}

export function RGBIntensityControl({
  onChange,
}: {
  onChange: (rgb: RGBIntensity) => void;
}) {
  const [red, setRed] = useState(255);
  const [green, setGreen] = useState(255);
  const [blue, setBlue] = useState(255);

  const redRef = useRef(red);
  const greenRef = useRef(green);
  const blueRef = useRef(blue);

  useEffect(() => {
    redRef.current = red;
    greenRef.current = green;
    blueRef.current = blue;
  }, [red, green, blue]);

  const commit = useCallback(() => {
    onChange({
      red: redRef.current,
      green: greenRef.current,
      blue: blueRef.current,
    });
  }, [onChange]);

  return (
    <MapControl order={100} position="top-right" margin>
      <Form style={{ width: 180 }} layout="horizontal">
        <Form.Item label={`R`}>
          <Slider
            min={0}
            max={255}
            step={1}
            value={red}
            onChange={setRed}
            onChangeComplete={commit}
          />
        </Form.Item>

        <Form.Item label={`G`}>
          <Slider
            min={0}
            max={255}
            step={1}
            value={green}
            onChange={setGreen}
            onChangeComplete={commit}
          />
        </Form.Item>

        <Form.Item label={`B`}>
          <Slider
            min={0}
            max={255}
            step={1}
            value={blue}
            onChange={setBlue}
            onChangeComplete={commit}
          />
        </Form.Item>
      </Form>
    </MapControl>
  );
}
