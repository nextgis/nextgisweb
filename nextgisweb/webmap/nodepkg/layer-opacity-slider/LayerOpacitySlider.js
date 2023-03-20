import PropTypes from "prop-types";

import { Slider } from "@nextgisweb/gui/antd";

export function LayerOpacitySlider({ onChange, defaultValue } = {}) {
    return (
        <Slider
            style={{ width: "calc(100% - 20px)" }}
            defaultValue={defaultValue}
            onChange={onChange}
            min={0}
            max={100}
            step={1}
        />
    );
}

LayerOpacitySlider.propTypes = {
    onChange: PropTypes.func,
    defaultValue: PropTypes.number,
};
