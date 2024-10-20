import { publish } from "dojo/topic";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { FeatureItem } from "@nextgisweb/feature-layer/type";
import { Alert } from "@nextgisweb/gui/antd";
import { errorModal } from "@nextgisweb/gui/error";
import type { ApiError } from "@nextgisweb/gui/error/type";
import { route } from "@nextgisweb/pyramid/api";
import { gettext } from "@nextgisweb/pyramid/i18n";

import { CoordinatesSwitcher } from "../../CoordinatesSwitcher";
import { PanelContentContainer } from "../../PanelContentContainer";
import type {
    FeatureInfo,
    IdentifyInfo,
    IdentifyResultProps,
} from "../../identification";
import { identifyInfoToFeaturesInfo } from "../util/identifyInfoToFeaturesInfo";

import { FeatureInfoSection } from "./FeatureInfoSection";
import { FeatureSelector } from "./FeatureSelector";

const msgNotFound = gettext("No objects were found at the click location.");
const msgLoad = gettext("Retrieving object information...");

const highlightFeature = (
    featureItem: FeatureItem,
    featureInfo: FeatureInfo
) => {
    const { label } = featureInfo;

    publish("feature.highlight", {
        geom: featureItem.geom,
        featureId: featureItem.id,
        layerId: featureInfo.layerId,
        featureInfo: { ...featureItem, labelWithLayer: label },
    });
};

const loadFeatureItem = async (
    identifyInfo: IdentifyInfo,
    featureInfo: FeatureInfo
) => {
    const layerResponse = identifyInfo.response[featureInfo.layerId];
    const featureResponse = layerResponse.features[featureInfo.idx];

    const featureItem = await route("feature_layer.feature.item", {
        id: featureResponse.layerId,
        fid: featureResponse.id,
    }).get({ minRequestDuration: 500 });

    highlightFeature(featureItem, featureInfo);
    return featureItem;
};

export function IdentifyResult({ identifyInfo, display }: IdentifyResultProps) {
    const [featureInfo, setFeatureInfo] = useState<FeatureInfo>();
    const [featureItem, setFeatureItem] = useState<FeatureItem>();
    const [loading, setLoading] = useState(false);

    const isNotFound = identifyInfo && identifyInfo.response.featureCount === 0;

    useEffect(() => {
        if (isNotFound) {
            setFeatureInfo(undefined);
            setFeatureItem(undefined);
        }
    }, [isNotFound]);

    const updateFeatureItem = useCallback(
        async (featureInfo: FeatureInfo) => {
            setFeatureItem(undefined);
            setLoading(true);
            try {
                const featureItemLoaded = await loadFeatureItem(
                    identifyInfo,
                    featureInfo
                );

                setFeatureItem(featureItemLoaded);
            } catch (er) {
                errorModal(er as ApiError);
            } finally {
                setLoading(false);
            }
        },
        [identifyInfo]
    );

    const onFeatureChange = useCallback(
        (featureInfo: FeatureInfo) => {
            setFeatureInfo(featureInfo);
            updateFeatureItem(featureInfo);
        },
        [updateFeatureItem]
    );

    const featuresInfoList = useMemo(() => {
        const options = identifyInfoToFeaturesInfo(identifyInfo, display);
        if (options.length) {
            const first = options[0];
            onFeatureChange(first);
        }
        return options;
    }, [identifyInfo, display, onFeatureChange]);

    if (!identifyInfo) {
        return null;
    }

    let loadElement = null;
    if (loading) {
        loadElement = (
            <div className="load-row">
                <div className="load">
                    <div>{msgLoad}</div>
                </div>
            </div>
        );
    }

    const coordinatesPanel = (
        <PanelContentContainer
            marginAll
            fill={
                <CoordinatesSwitcher
                    display={display}
                    identifyInfo={identifyInfo}
                />
            }
        />
    );

    let noFoundElement = null;
    if (isNotFound) {
        noFoundElement = (
            <PanelContentContainer
                noMarginX
                fill={
                    <Alert
                        message={msgNotFound}
                        type="warning"
                        banner
                        showIcon
                    />
                }
            />
        );
    }

    let featureSelector;
    if (!isNotFound) {
        featureSelector = (
            <FeatureSelector
                display={display}
                featureInfo={featureInfo}
                featureItem={featureItem}
                featuresInfoList={featuresInfoList}
                onFeatureChange={onFeatureChange}
            />
        );
    }

    let tabsElement;
    if (featureItem && featureInfo) {
        tabsElement = (
            <FeatureInfoSection
                display={display}
                featureInfo={featureInfo}
                featureItem={featureItem}
                onUpdate={() => updateFeatureItem(featureInfo)}
            />
        );
    }

    return (
        <>
            <div className="top">{featureSelector}</div>
            <div className="center">
                {loadElement}
                {tabsElement}
                {noFoundElement}
            </div>
            <div className="bottom">{coordinatesPanel}</div>
        </>
    );
}
