import { useMemo } from "react";
import { Select } from "@nextgisweb/gui/antd";

import PropTypes from "prop-types";

export function BasemapSelector(
    {
        map,
        basemapDefault,
        onChange
    }) {
    const options = useMemo(() => {
        const options_ = [];
        for (const [key, layer] of Object.entries(map.layers)) {
            if (!layer.isBaseLayer) continue;
            options_.push({
                label: layer.title,
                value: key
            });
        }
        return options_;
    }, [map]);

    return (
        <Select
            defaultValue={basemapDefault}
            options={options}
            onChange={(key) => onChange(key)}
             style={{ width: "100%" }}
        />
    );
}

BasemapSelector.propTypes = {
    map: PropTypes.object,
    basemapDefault: PropTypes.string,
    onChange: PropTypes.func
};
