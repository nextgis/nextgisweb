import { Slider, Tooltip } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import OpacityIcon from "@nextgisweb/icon/material/opacity";

import "./LayerOpacitySlider.less";

const msgTooltip = gettext("Opacity");

export function LayerOpacitySlider({
    onChange,
    defaultValue,
}: {
    onChange: (opacity: number) => void;
    defaultValue: number;
}) {
    return (
        <div className="ngw-webmap-layer-opacity-slider">
            <Tooltip title={msgTooltip}>
                <OpacityIcon />
            </Tooltip>
            <Slider
                defaultValue={defaultValue}
                onChange={onChange}
                min={0}
                max={100}
                step={1}
            />
        </div>
    );
}
