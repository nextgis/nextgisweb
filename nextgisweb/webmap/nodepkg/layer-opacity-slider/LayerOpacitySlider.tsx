import { Slider, Tooltip } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import OpacityIcon from "@nextgisweb/icon/material/opacity";

import "./LayerOpacitySlider.less";

const msgTooltip = gettext("Opacity");

export interface LayerOpacitySliderProps {
  defaultValue: number;
  onChange: (opacity: number) => void;
}

export function LayerOpacitySlider({
  defaultValue,
  onChange,
}: LayerOpacitySliderProps) {
  return (
    <div className="ngw-webmap-layer-opacity-slider">
      <Tooltip title={msgTooltip}>
        <OpacityIcon />
      </Tooltip>
      <Slider
        defaultValue={defaultValue * 100}
        min={0}
        max={100}
        step={1}
        onChange={(value) => onChange(value / 100)}
      />
    </div>
  );
}
