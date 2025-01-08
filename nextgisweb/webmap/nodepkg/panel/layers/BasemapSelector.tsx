import { observer } from "mobx-react-lite";
import { useMemo } from "react";

import { Select } from "@nextgisweb/gui/antd";
import type { OptionType } from "@nextgisweb/gui/antd";
import type { Display } from "@nextgisweb/webmap/display";

import { UpOutlined } from "@ant-design/icons";

interface BasemapSelectorProps {
    display: Display;
}

export const BasemapSelector = observer(({ display }: BasemapSelectorProps) => {
    const { map, activeBasemapKey, switchBasemap } = display;
    const { baseLayers } = map;

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
