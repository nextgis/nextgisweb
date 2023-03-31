import PropTypes from "prop-types";

import { Slider, Tooltip } from "@nextgisweb/gui/antd";
import i18n from "@nextgisweb/pyramid/i18n!webmap";

import OpacityRationIcon from "@material-icons/svg/tonality/baseline";

const titleMsg = i18n.gettext('Opacity');

export function LayerOpacitySlider({ onChange, defaultValue } = {}) {
    return (
        <div className="ant-dropdown-menu-title-content">
            <Tooltip title={titleMsg}>
                <OpacityRationIcon></OpacityRationIcon>
            </Tooltip>
            <Slider
                style={{ width: "calc(100% - 20px)" }}
                defaultValue={defaultValue}
                onChange={onChange}
                min={0}
                max={100}
                step={1}
            />
        </div>
    );
}

LayerOpacitySlider.propTypes = {
    onChange: PropTypes.func,
    defaultValue: PropTypes.number,
};
