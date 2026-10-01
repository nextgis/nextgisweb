import { Slider, Space } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { MapControl } from "./MapControl";

import OpacityIcon from "@nextgisweb/icon/material/opacity";

const msgOpacity = gettext("Opacity");

export function OpacityControl({
  value,
  onChange,
}: {
  value: number;
  onChange: (opacity: number) => void;
}) {
  return (
    <MapControl position="top-right" margin bar>
      <Space style={{ gap: 6, marginInline: 8 }}>
        <span title={msgOpacity}>
          <OpacityIcon style={{ display: "block", width: 20, height: 20 }} />
        </span>
        <Slider
          style={{ width: 100 }}
          min={0}
          max={100}
          value={value}
          onChange={onChange}
          tooltip={{ open: false }}
          ariaLabelForHandle={msgOpacity}
        />
      </Space>
    </MapControl>
  );
}
