import { observer } from "mobx-react-lite";
import { useMemo } from "react";

import { Select } from "@nextgisweb/gui/antd";
import type { OptionType } from "@nextgisweb/gui/antd";
import type { MapStore } from "@nextgisweb/webmap/ol/MapStore";

import { UpOutlined } from "@ant-design/icons";

interface BasemapSelectorProps {
    map: MapStore;
}

export const BasemapSelector = observer(({ map }: BasemapSelectorProps) => {
    const { baseLayers, activeBasemapKey, switchBasemap } = map;

    const options = useMemo<OptionType[]>(() => {
        const options_ = [];
        for (const [key, layer] of Object.entries(baseLayers)) {
            options_.push({
                label: layer.title,
                value: key,
            });
        }
        return options_;
    }, [baseLayers]);

    return (
        <Select
            value={activeBasemapKey}
            options={options}
            onChange={switchBasemap}
            style={{ width: "100%" }}
            variant="borderless"
            suffixIcon={<UpOutlined style={{ pointerEvents: "none" }} />}
        />
    );
});

BasemapSelector.displayName = "BasemapSelector";
