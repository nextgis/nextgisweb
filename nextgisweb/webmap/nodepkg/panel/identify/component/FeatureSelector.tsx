import { Button, Select, Tooltip } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import type { FeatureSelectorProps, IdentifyInfoItem } from "../identification";

import ZoomInMapIcon from "@nextgisweb/icon/material/zoom_in_map/outline";

export function FeatureSelector({
    display,
    featureInfo,
    featureItem,
    featuresInfoList,
    onFeatureChange,
}: FeatureSelectorProps) {
    if (!featureInfo) {
        return null;
    }

    const zoomTo = () => {
        if (!featureItem) return;
        display.featureHighlighter
            .highlightFeatureById(featureItem.id, featureInfo.layerId)
            .then((feature) => {
                display.map.zoomToFeature(feature);
            });
    };

    const onSelectChange = (
        _value: string,
        featureInfoSelected: IdentifyInfoItem | IdentifyInfoItem[] | undefined
    ) => {
        const selected = Array.isArray(featureInfoSelected)
            ? featureInfoSelected[0]
            : featureInfoSelected;
        onFeatureChange(selected);
    };

    return (
        <div
            style={{
                display: "flex",
                alignItems: "center",
                padding: "8px",
                gap: "4px",
            }}
        >
            <Select
                onChange={onSelectChange}
                style={{ flex: "1 1 auto", minWidth: 0 }}
                value={featureInfo.value}
                options={featuresInfoList}
            />
            {featureInfo.type === "feature_layer" && (
                <Tooltip title={gettext("Zoom to feature")}>
                    <Button
                        type="link"
                        size="small"
                        onClick={zoomTo}
                        icon={<ZoomInMapIcon />}
                        style={{ flex: "0 0 auto" }}
                    />
                </Tooltip>
            )}
        </div>
    );
}
