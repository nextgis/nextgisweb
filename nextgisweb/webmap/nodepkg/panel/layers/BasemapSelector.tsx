import { observer } from "mobx-react-lite";
import { useMemo } from "react";

import { Select } from "@nextgisweb/gui/antd";
import type { OptionType } from "@nextgisweb/gui/antd";
import type ShadowDisplay from "@nextgisweb/webmap/compat/ShadowDisplay";

import { UpOutlined } from "@ant-design/icons";

interface BasemapSelectorProps {
    display: ShadowDisplay;
}

export const BasemapSelector = observer(({ display }: BasemapSelectorProps) => {
    const { map, activeBasemapKey } = display;

    const options = useMemo<OptionType[]>(() => {
        const options_ = [];
        for (const [key, layer] of Object.entries(map.layers)) {
            if (!layer.isBaseLayer) continue;
            options_.push({
                label: layer.title,
                value: key,
            });
        }
        return options_;
    }, [map.layers]);

    return (
        <Select
            defaultValue={activeBasemapKey}
            options={options}
            onChange={(key) => {
                display._switchBasemap(key);
            }}
            style={{ width: "100%" }}
            variant="borderless"
            suffixIcon={<UpOutlined style={{ pointerEvents: "none" }} />}
        />
    );
});

BasemapSelector.displayName = "BasemapSelector";
