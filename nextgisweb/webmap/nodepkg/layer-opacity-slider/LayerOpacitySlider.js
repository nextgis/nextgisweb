import { Slider, Tooltip } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import Icon from "@nextgisweb/icon/mdi/circle-opacity";

import "./LayerOpacitySlider.less";

const mTooltip = gettext("Opacity");

export function LayerOpacitySlider({ onChange, defaultValue }) {
    return (
        <div className="ngw-webmap-layer-opacity-slider">
            <Tooltip title={mTooltip}>
                <Icon />
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
