import { Slider, Tooltip } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import Icon from "@nextgisweb/icon/mdi/circle-opacity";

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
