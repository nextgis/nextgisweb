import { Button, Col, Row, Select, Tooltip } from "@nextgisweb/gui/antd";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { PanelContentContainer } from "../../PanelContentContainer";
import type { FeatureInfo, FeatureSelectorProps } from "../../identification";

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
        featureInfoSelected: FeatureInfo | FeatureInfo[] | undefined
    ) => {
        const selected = Array.isArray(featureInfoSelected)
            ? featureInfoSelected[0]
            : featureInfoSelected;
        onFeatureChange(selected);
    };

    return (
        <PanelContentContainer
            marginAll
            content={
                <Row wrap={false}>
                    <Col flex="1 1 auto">
                        <Select
                            onChange={onSelectChange}
                            style={{ width: "100%" }}
                            value={featureInfo.value}
                            options={featuresInfoList}
                        />
                    </Col>
                    <Col flex="0 0 auto">
                        <Tooltip title={gettext("Zoom to feature")}>
                            <Button
                                type="link"
                                onClick={zoomTo}
                                icon={<ZoomInMapIcon />}
                            />
                        </Tooltip>
                    </Col>
                </Row>
            }
        />
    );
}
